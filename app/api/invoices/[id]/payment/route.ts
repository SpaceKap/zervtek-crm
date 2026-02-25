import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PaymentStatus, UserRole, TransactionType } from "@prisma/client"
import { getInvoiceTotalWithTax, isAmountPaidInFull, hasPartialPayment } from "@/lib/invoice-utils"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Allow managers, accountants, and admins to update payment status (or via webhook with secret)
    const body = await request.json()
    const { paymentStatus, paidAt, amountReceived, webhookSecret, applyFromWallet } = body

    // Check webhook secret if provided (for Wise webhooks)
    if (webhookSecret) {
      const expectedSecret = process.env.WISE_WEBHOOK_SECRET
      if (!expectedSecret || webhookSecret !== expectedSecret) {
        return NextResponse.json({ error: "Invalid webhook secret" }, { status: 403 })
      }
    } else {
      // If no webhook secret, require manager, accountant, or admin role
      const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT]
      if (!allowedRoles.includes(session.user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        charges: { include: { chargeType: { select: { name: true } } } },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    // Calculate total amount (charges + tax if enabled) - what customer actually owes
    const totalAmount = getInvoiceTotalWithTax(invoice)

    // Validate payment status
    const validStatuses = Object.values(PaymentStatus)
    if (paymentStatus && !validStatuses.includes(paymentStatus)) {
      return NextResponse.json(
        { error: "Invalid payment status" },
        { status: 400 }
      )
    }

    // Determine payment status based on amount received if provided
    let finalPaymentStatus = paymentStatus
    if (amountReceived !== undefined && amountReceived !== null) {
      const receivedAmount = parseFloat(amountReceived.toString())
      if (isAmountPaidInFull(receivedAmount, totalAmount)) {
        finalPaymentStatus = PaymentStatus.PAID
      } else if (hasPartialPayment(receivedAmount)) {
        finalPaymentStatus = PaymentStatus.PARTIALLY_PAID
      } else {
        finalPaymentStatus = PaymentStatus.PENDING
      }
    }

    // Update payment status and create Transaction when amount received
    const updateData: any = {}
    if (finalPaymentStatus) {
      updateData.paymentStatus = finalPaymentStatus
    }
    const paidAtDate = paidAt ? new Date(paidAt) : (finalPaymentStatus === PaymentStatus.PAID && !invoice.paidAt ? new Date() : undefined)
    if (paidAtDate) {
      updateData.paidAt = paidAtDate
    }

    const receivedAmount = amountReceived !== undefined && amountReceived !== null
      ? parseFloat(amountReceived.toString())
      : null

    // When applying from wallet, validate balance: Deposits − (Applied to invoice + Refunds)
    if (applyFromWallet && receivedAmount != null && receivedAmount > 0 && !webhookSecret) {
      const customerTx = await prisma.transaction.findMany({
        where: { customerId: invoice.customerId },
        select: { direction: true, amount: true, currency: true, description: true },
      })
      const walletBalance = customerTx.reduce((sum, tx) => {
        const amt = Number(tx.amount)
        const isJy = (tx.currency || "JPY").toUpperCase() === "JPY"
        if (!isJy) return sum
        if (tx.direction === "INCOMING") {
          if (tx.description === "Deposit") return sum + amt
          return sum
        }
        return sum - amt
      }, 0)
      if (receivedAmount > walletBalance) {
        return NextResponse.json(
          { error: `Insufficient wallet balance. Available: ¥${(Math.round(walletBalance * 100) / 100).toLocaleString()}` },
          { status: 400 }
        )
      }
    }

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id: params.id },
        data: updateData,
        include: {
          customer: true,
          vehicle: true,
        },
      })

      if (receivedAmount != null && receivedAmount > 0) {
        // When applying from wallet: create OUTGOING from customer (deduct wallet), then INCOMING to invoice
        if (applyFromWallet && !webhookSecret) {
          await tx.transaction.create({
            data: {
              direction: "OUTGOING",
              type: TransactionType.BANK_TRANSFER,
              amount: receivedAmount,
              currency: "JPY",
              date: paidAtDate || new Date(),
              description: `Applied from wallet to Invoice ${invoice.invoiceNumber}`,
              customerId: invoice.customerId,
              vehicleId: invoice.vehicleId,
              createdById: session?.user?.id ?? null,
            },
          })
        }
        // INCOMING transaction for the invoice (payment record)
        await tx.transaction.create({
          data: {
            direction: "INCOMING",
            type: TransactionType.BANK_TRANSFER,
            amount: receivedAmount,
            currency: "JPY",
            date: paidAtDate || new Date(),
            description: `Payment for Invoice ${invoice.invoiceNumber}`,
            invoiceId: params.id,
            customerId: invoice.customerId,
            vehicleId: invoice.vehicleId,
            createdById: webhookSecret ? null : session?.user?.id ?? null,
          },
        })
      }

      return updated
    })

    return NextResponse.json(updatedInvoice)
  } catch (error) {
    console.error("Error updating payment status:", error)
    return NextResponse.json(
      { error: "Failed to update payment status" },
      { status: 500 }
    )
  }
}
