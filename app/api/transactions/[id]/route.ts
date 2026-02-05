import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageTransactions } from "@/lib/permissions"
import { TransactionDirection, TransactionType } from "@prisma/client"
import { convertDecimalsToNumbers } from "@/lib/decimal"

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
      invoiceUrl,
      referenceNumber,
      notes,
    } = body

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
    if (invoiceUrl !== undefined) updateData.invoiceUrl = invoiceUrl
    if (referenceNumber !== undefined) updateData.referenceNumber = referenceNumber
    if (notes !== undefined) updateData.notes = notes

    const transaction = await prisma.transaction.update({
      where: { id: params.id },
      data: updateData,
      include: {
        vendor: true,
        customer: true,
        vehicle: true,
      },
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

    await prisma.transaction.delete({
      where: { id: params.id },
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
