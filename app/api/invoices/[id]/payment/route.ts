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
    const { paymentStatus, paidAt, amountReceived, webhookSecret } = body

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

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id: params.id },
        data: updateData,
        include: {
          customer: true,
          vehicle: true,
        },
      })

      // Create INCOMING Transaction when marking paid with amount (sync payment records)
      if (receivedAmount != null && receivedAmount > 0) {
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
