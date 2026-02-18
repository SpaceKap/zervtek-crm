import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageVehicleStages } from "@/lib/permissions"
import { TransactionType } from "@prisma/client"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; costId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManageVehicleStages(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { costType, amount, vendorId, currency, paymentDeadline, paymentDate, invoiceUrl } = body

    const existingCost = await prisma.vehicleStageCost.findUnique({
      where: { id: params.costId },
    })

    if (!existingCost) {
      return NextResponse.json(
        { error: "Cost not found" },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (costType !== undefined) updateData.costType = costType
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (vendorId !== undefined) updateData.vendorId = vendorId
    if (currency !== undefined) updateData.currency = currency
    if (paymentDeadline !== undefined) updateData.paymentDeadline = paymentDeadline ? new Date(paymentDeadline) : null
    const paymentDateValue = paymentDate ? new Date(paymentDate) : null
    if (paymentDate !== undefined) updateData.paymentDate = paymentDateValue
    if (invoiceUrl !== undefined) updateData.invoiceUrl = invoiceUrl || null

    const cost = await prisma.$transaction(async (tx) => {
      const updated = await tx.vehicleStageCost.update({
        where: { id: params.costId },
        data: updateData,
        include: {
          vendor: true,
        },
      })

      // Create OUTGOING Transaction when marking cost as paid (sync expense <-> payment)
      if (paymentDateValue && session?.user?.id) {
        const existing = await tx.transaction.findFirst({
          where: { vehicleStageCostId: params.costId },
        })
        if (!existing) {
          await tx.transaction.create({
            data: {
              direction: "OUTGOING",
              type: TransactionType.BANK_TRANSFER,
              amount: parseFloat(updated.amount.toString()),
              currency: updated.currency || "JPY",
              date: paymentDateValue,
              description: `${updated.costType} - ${updated.vendor?.name || "Vendor"}`,
              vendorId: updated.vendorId,
              vehicleId: updated.vehicleId,
              vehicleStageCostId: params.costId,
              createdById: session.user.id,
            },
          })
        }
      }

      return updated
    })

    return NextResponse.json(cost)
  } catch (error) {
    console.error("Error updating cost:", error)
    return NextResponse.json(
      { error: "Failed to update cost" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; costId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManageVehicleStages(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const cost = await prisma.vehicleStageCost.findUnique({
      where: { id: params.costId },
    })

    if (!cost) {
      return NextResponse.json(
        { error: "Cost not found" },
        { status: 404 }
      )
    }

    await prisma.vehicleStageCost.delete({
      where: { id: params.costId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting cost:", error)
    return NextResponse.json(
      { error: "Failed to delete cost" },
      { status: 500 }
    )
  }
}
