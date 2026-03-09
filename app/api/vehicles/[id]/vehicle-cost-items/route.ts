import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageVehicleStages } from "@/lib/permissions"
import { convertDecimalsToNumbers } from "@/lib/decimal"

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    const items = await prisma.vehicleCostItem.findMany({
      where: { vehicleId: params.id },
      include: { vendor: true },
      orderBy: { createdAt: "desc" },
    })

    const toDateStr = (d: Date | null | undefined) =>
      d ? (d instanceof Date ? d.toISOString() : String(d)) : null

    const formatted = items.map((item) => ({
      id: item.id,
      vehicleId: item.vehicleId,
      description: item.description,
      amount: item.amount,
      vendorId: item.vendorId,
      vendor: item.vendor,
      paymentDeadline: toDateStr(item.paymentDeadline),
      paymentDate: toDateStr(item.paymentDate),
      category: item.category,
      createdAt: toDateStr(item.createdAt),
      updatedAt: toDateStr(item.updatedAt),
    }))

    return NextResponse.json(convertDecimalsToNumbers(formatted))
  } catch (error) {
    console.error("Error fetching vehicle cost items:", error)
    return NextResponse.json(
      { error: "Failed to fetch vehicle cost items" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
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

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      )
    }

    const { description, amount, vendorId, paymentDeadline, paymentDate, category } = body

    if (!description || amount == null || !vendorId || !paymentDeadline) {
      return NextResponse.json(
        { error: "Description, amount, vendor, and payment deadline are required" },
        { status: 400 }
      )
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
    })
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    })
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 400 })
    }

    const parsedAmount = parseFloat(String(amount))
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Must be a positive number" },
        { status: 400 }
      )
    }

    const item = await prisma.vehicleCostItem.create({
      data: {
        vehicleId: params.id,
        description: String(description).trim(),
        amount: parsedAmount,
        vendorId,
        paymentDeadline: new Date(paymentDeadline),
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        category: category ? String(category).trim() : null,
      },
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
      }),
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Error creating vehicle cost item:", error)
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "Invalid vendor or vehicle reference" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error?.message || "Failed to create vehicle cost item" },
      { status: 500 }
    )
  }
}
