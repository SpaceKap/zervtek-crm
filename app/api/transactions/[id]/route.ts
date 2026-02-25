import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageTransactions } from "@/lib/permissions"
import { PrismaClient, TransactionDirection, TransactionType } from "@prisma/client"
import { convertDecimalsToNumbers } from "@/lib/decimal"
import {
  getInvoiceTotalWithTax,
  isAmountPaidInFull,
  hasPartialPayment,
} from "@/lib/invoice-utils"

/** Transaction client type (same as callback param of prisma.$transaction). */
type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>

/** Compute totalCharges, totalReceived, purchasePaid for a vehicle (for VehicleShippingStage sync). */
async function getVehiclePaymentSummary(tx: TxClient, vehicleId: string) {
  const vehicleTransactions = await tx.transaction.findMany({
    where: { vehicleId, direction: "INCOMING" },
  })
  const totalReceived = vehicleTransactions.reduce(
    (sum, t) => sum + parseFloat(t.amount.toString()),
    0,
  )
  const vehicleInvoices = await tx.invoice.findMany({
    where: { vehicleId },
    include: {
      charges: { include: { chargeType: { select: { name: true } } } },
    },
  })
  const totalCharges = vehicleInvoices.reduce(
    (sum, inv) => sum + getInvoiceTotalWithTax(inv),
    0,
  )
  const purchasePaid = totalCharges > 0 && isAmountPaidInFull(totalReceived, totalCharges)
  return { totalCharges, totalReceived, purchasePaid }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: {
        vendor: true,
        customer: true,
        vehicle: true,
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(convertDecimalsToNumbers(transaction))
  } catch (error) {
    console.error("Error fetching transaction:", error)
    return NextResponse.json(
      { error: "Failed to fetch transaction" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManageTransactions(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const {
      direction,
      type,
      amount,
      currency,
      date,
      description,
      vendorId,
      customerId,
      vehicleId,
      invoiceId,
      containerInvoiceId,
      vehicleStageCostId,
      costItemId,
      generalCostId,
      invoiceUrl,
      referenceNumber,
      notes,
      depositReceivedAt,
    } = body

    // Get current transaction to check for changes
    const currentTransaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      select: {
        invoiceId: true,
        vehicleId: true,
        direction: true,
        amount: true,
        vehicleStageCostId: true,
        costItemId: true,
        generalCostId: true,
      },
    })

    if (!currentTransaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (direction !== undefined) updateData.direction = direction
    if (type !== undefined) updateData.type = type
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (currency !== undefined) updateData.currency = currency
    if (date !== undefined) updateData.date = new Date(date)
    if (description !== undefined) updateData.description = description
    if (vendorId !== undefined) updateData.vendorId = vendorId
    if (customerId !== undefined) updateData.customerId = customerId
    if (vehicleId !== undefined) updateData.vehicleId = vehicleId
    if (invoiceId !== undefined) updateData.invoiceId = invoiceId
    if (containerInvoiceId !== undefined) updateData.containerInvoiceId = containerInvoiceId
    if (vehicleStageCostId !== undefined) updateData.vehicleStageCostId = vehicleStageCostId
    if (costItemId !== undefined) updateData.costItemId = costItemId
    if (generalCostId !== undefined) updateData.generalCostId = generalCostId
    if (invoiceUrl !== undefined) updateData.invoiceUrl = invoiceUrl
    if (referenceNumber !== undefined) updateData.referenceNumber = referenceNumber
    if (notes !== undefined) updateData.notes = notes
    if (depositReceivedAt !== undefined) {
      updateData.depositReceivedAt = depositReceivedAt ? new Date(depositReceivedAt) : null
    }

    // Update transaction and sync with invoice/vehicle
    const transaction = await prisma.$transaction(async (tx) => {
      const updatedTransaction = await tx.transaction.update({
        where: { id: params.id },
        data: updateData,
        include: {
          vendor: true,
          customer: true,
          vehicle: true,
        },
      })

      const finalInvoiceId = invoiceId !== undefined ? invoiceId : currentTransaction?.invoiceId
      const finalVehicleId = vehicleId !== undefined ? vehicleId : currentTransaction?.vehicleId
      const finalDirection = direction !== undefined ? direction : currentTransaction?.direction
      const oldInvoiceId = currentTransaction?.invoiceId
      const oldVehicleId = currentTransaction?.vehicleId
      const wasIncoming = currentTransaction?.direction === "INCOMING"

      // Recalc OLD invoice if we unlinked or changed direction (transaction no longer counts)
      if (oldInvoiceId && wasIncoming && (oldInvoiceId !== finalInvoiceId || finalDirection !== "INCOMING")) {
        const invoice = await tx.invoice.findUnique({
          where: { id: oldInvoiceId },
          include: {
            charges: { include: { chargeType: { select: { name: true } } } },
          },
        })
        if (invoice) {
          const totalAmount = getInvoiceTotalWithTax(invoice)
          const invoiceTransactions = await tx.transaction.findMany({
            where: {
              invoiceId: oldInvoiceId,
              direction: "INCOMING",
              id: { not: params.id },
            },
          })
          const totalReceived = invoiceTransactions.reduce(
            (sum, t) => sum + parseFloat(t.amount.toString()),
            0,
          )
          let paymentStatus = "PENDING"
          if (isAmountPaidInFull(totalReceived, totalAmount)) paymentStatus = "PAID"
          else if (hasPartialPayment(totalReceived)) paymentStatus = "PARTIALLY_PAID"
          await tx.invoice.update({
            where: { id: oldInvoiceId },
            data: {
              paymentStatus: paymentStatus as any,
              paidAt: paymentStatus === "PAID" ? new Date() : null,
            },
          })
        }
      }

      // Recalc OLD vehicle if we unlinked or changed direction
      if (oldVehicleId && wasIncoming && (oldVehicleId !== finalVehicleId || finalDirection !== "INCOMING")) {
        const vehicleTransactions = await tx.transaction.findMany({
          where: {
            vehicleId: oldVehicleId,
            direction: "INCOMING",
            id: { not: params.id },
          },
        })
        const totalReceived = vehicleTransactions.reduce(
          (sum, t) => sum + parseFloat(t.amount.toString()),
          0,
        )
        const vehicleInvoices = await tx.invoice.findMany({
          where: { vehicleId: oldVehicleId },
          include: {
            charges: { include: { chargeType: { select: { name: true } } } },
          },
        })
        const totalCharges = vehicleInvoices.reduce(
          (sum, inv) => sum + getInvoiceTotalWithTax(inv),
          0,
        )
        const purchasePaid = totalCharges > 0 && isAmountPaidInFull(totalReceived, totalCharges)
        await tx.vehicleShippingStage.upsert({
          where: { vehicleId: oldVehicleId },
          update: { totalCharges, totalReceived, purchasePaid },
          create: { vehicleId: oldVehicleId, stage: "PURCHASE", totalCharges, totalReceived, purchasePaid },
        })
      }

      // Sync NEW invoice payment status
      if (finalInvoiceId && finalDirection === "INCOMING") {
        const invoice = await tx.invoice.findUnique({
          where: { id: finalInvoiceId },
          include: {
            charges: { include: { chargeType: { select: { name: true } } } },
          },
        })
        if (invoice) {
          const totalAmount = getInvoiceTotalWithTax(invoice)
          const invoiceTransactions = await tx.transaction.findMany({
            where: {
              invoiceId: finalInvoiceId,
              direction: "INCOMING",
            },
          })
          const totalReceived = invoiceTransactions.reduce(
            (sum, t) => sum + parseFloat(t.amount.toString()),
            0,
          )
          let paymentStatus = "PENDING"
          if (isAmountPaidInFull(totalReceived, totalAmount)) paymentStatus = "PAID"
          else if (hasPartialPayment(totalReceived)) paymentStatus = "PARTIALLY_PAID"
          await tx.invoice.update({
            where: { id: finalInvoiceId },
            data: {
              paymentStatus: paymentStatus as any,
              paidAt: paymentStatus === "PAID" ? new Date() : null,
            },
          })
        }
      }

      // Sync NEW vehicle payment tracking
      if (finalVehicleId && finalDirection === "INCOMING") {
        const { totalCharges, totalReceived, purchasePaid } = await getVehiclePaymentSummary(tx, finalVehicleId)
        await tx.vehicleShippingStage.upsert({
          where: { vehicleId: finalVehicleId },
          update: { totalCharges, totalReceived, purchasePaid },
          create: { vehicleId: finalVehicleId, stage: "PURCHASE", totalCharges, totalReceived, purchasePaid },
        })
      }

      // Sync expense paymentDate when OUTGOING and linked to expense
      const finalVscId = vehicleStageCostId !== undefined ? vehicleStageCostId : currentTransaction?.vehicleStageCostId
      const finalCiId = costItemId !== undefined ? costItemId : currentTransaction?.costItemId
      if (updatedTransaction.direction === "OUTGOING") {
        const txnDate = updatedTransaction.date
        if (finalVscId) {
          await tx.vehicleStageCost.update({
            where: { id: finalVscId },
            data: { paymentDate: txnDate },
          })
        }
        if (finalCiId) {
          await tx.costItem.update({
            where: { id: finalCiId },
            data: { paymentDate: txnDate },
          })
        }
      }

      return updatedTransaction
    })

    return NextResponse.json(convertDecimalsToNumbers(transaction))
  } catch (error) {
    console.error("Error updating transaction:", error)
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManageTransactions(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get transaction before deletion to sync invoice/vehicle
    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      select: { invoiceId: true, vehicleId: true, direction: true },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Delete transaction
      await tx.transaction.delete({
        where: { id: params.id },
      })

      // Sync invoice payment status if transaction was linked to an invoice
      if (transaction?.invoiceId && transaction.direction === "INCOMING") {
        const invoice = await tx.invoice.findUnique({
          where: { id: transaction.invoiceId },
          include: {
            charges: { include: { chargeType: { select: { name: true } } } },
          },
        })

        if (invoice) {
          const totalAmount = getInvoiceTotalWithTax(invoice)

          const invoiceTransactions = await tx.transaction.findMany({
            where: {
              invoiceId: transaction.invoiceId,
              direction: "INCOMING",
            },
          })

          const totalReceived = invoiceTransactions.reduce(
            (sum, t) => sum + parseFloat(t.amount.toString()),
            0,
          )

          let paymentStatus = "PENDING"
          if (isAmountPaidInFull(totalReceived, totalAmount)) paymentStatus = "PAID"
          else if (hasPartialPayment(totalReceived)) paymentStatus = "PARTIALLY_PAID"

          await tx.invoice.update({
            where: { id: transaction.invoiceId },
            data: {
              paymentStatus: paymentStatus as any,
              paidAt: paymentStatus === "PAID" ? new Date() : null,
            },
          })
        }
      }

      // Sync vehicle payment tracking if transaction was linked to a vehicle
      if (transaction?.vehicleId && transaction.direction === "INCOMING") {
        const { totalCharges, totalReceived, purchasePaid } = await getVehiclePaymentSummary(tx, transaction.vehicleId)
        await tx.vehicleShippingStage.upsert({
          where: { vehicleId: transaction.vehicleId },
          update: { totalCharges, totalReceived, purchasePaid },
          create: {
            vehicleId: transaction.vehicleId,
            stage: "PURCHASE",
            totalCharges,
            totalReceived,
            purchasePaid,
          },
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    )
  }
}
