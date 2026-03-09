import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageVehicleStages } from "@/lib/permissions"
import { convertDecimalsToNumbers } from "@/lib/decimal"

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string; itemId: string }> }
) {
  const params = await props.params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!canManageVehicleStages(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { description, amount, vendorId, paymentDeadline, paymentDate, category } = body

    const existing = await prisma.vehicleCostItem.findFirst({
      where: { id: params.itemId, vehicleId: params.id },
      include: { vendor: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Vehicle cost item not found" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (description !== undefined) updateData.description = String(description).trim()
    if (amount !== undefined) {
      const parsed = parseFloat(String(amount))
      if (isNaN(parsed) || parsed <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
      }
      updateData.amount = parsed
    }
    if (vendorId !== undefined) {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } })
      if (!vendor) {
        return NextResponse.json({ error: "Vendor not found" }, { status: 400 })
      }
      updateData.vendorId = vendorId
    }
    if (paymentDeadline !== undefined) updateData.paymentDeadline = new Date(paymentDeadline)
    if (paymentDate !== undefined) updateData.paymentDate = paymentDate ? new Date(paymentDate) : null
    if (category !== undefined) updateData.category = category ? String(category).trim() : null

    const item = await prisma.vehicleCostItem.update({
      where: { id: params.itemId },
      data: updateData,
      include: { vendor: true },
    })

    const toDateStr = (d: Date | null | undefined) =>
      d ? (d instanceof Date ? d.toISOString() : String(d)) : null

    return NextResponse.json(
      convertDecimalsToNumbers({
        ...item,
        paymentDeadline: toDateStr(item.paymentDeadline),
        paymentDate: toDateStr(item.paymentDate),
        createdAt: toDateStr(item.createdAt),
        updatedAt: toDateStr(item.updatedAt),
      })
    )
  } catch (error: any) {
    console.error("Error updating vehicle cost item:", error)
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Vehicle cost item not found" }, { status: 404 })
    }
    return NextResponse.json(
      { error: error?.message || "Failed to update vehicle cost item" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string; itemId: string }> }
) {
  const params = await props.params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!canManageVehicleStages(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const existing = await prisma.vehicleCostItem.findFirst({
      where: { id: params.itemId, vehicleId: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Vehicle cost item not found" }, { status: 404 })
    }

    await prisma.vehicleCostItem.delete({
      where: { id: params.itemId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting vehicle cost item:", error)
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Vehicle cost item not found" }, { status: 404 })
    }
    return NextResponse.json(
      { error: error?.message || "Failed to delete vehicle cost item" },
      { status: 500 }
    )
  }
}
