import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageVehicleStages } from "@/lib/permissions"

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
    const { costType, amount, vendorId, currency, paymentDeadline, paymentDate } = body

    const updateData: any = {}
    if (costType !== undefined) updateData.costType = costType
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (vendorId !== undefined) updateData.vendorId = vendorId
    if (currency !== undefined) updateData.currency = currency
    if (paymentDeadline !== undefined) updateData.paymentDeadline = paymentDeadline ? new Date(paymentDeadline) : null
    if (paymentDate !== undefined) updateData.paymentDate = paymentDate ? new Date(paymentDate) : null

    const cost = await prisma.vehicleStageCost.update({
      where: { id: params.costId },
      data: updateData,
      include: {
        vendor: true,
      },
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
