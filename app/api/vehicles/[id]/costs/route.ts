import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageVehicleStages } from "@/lib/permissions"
import { ShippingStage } from "@prisma/client"
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

    const { searchParams } = new URL(request.url)
    const stage = searchParams.get("stage") as ShippingStage | null

    const where: any = { vehicleId: params.id }
    if (stage) {
      where.stage = stage
    }

    const vehicleStageCosts = await prisma.vehicleStageCost.findMany({
      where,
      include: {
        vendor: true,
      },
      orderBy: { createdAt: "desc" },
    })

    // Also fetch CostItems from invoices linked to this vehicle
    const invoicesWithCosts = await prisma.invoice.findMany({
      where: { vehicleId: params.id },
      include: {
        costInvoice: {
          include: {
            costItems: {
              include: {
                vendor: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    })

    const invoiceCostItems: any[] = []
    for (const inv of invoicesWithCosts) {
      if (!inv.costInvoice?.costItems?.length) continue
      for (const item of inv.costInvoice.costItems) {
        invoiceCostItems.push({
          id: `invoice-cost-${item.id}`,
          costType: item.category || item.description,
          amount: item.amount,
          currency: "JPY",
          vendorId: item.vendorId,
          vendor: item.vendor,
          paymentDeadline: item.paymentDeadline
            ? (item.paymentDeadline instanceof Date
                ? item.paymentDeadline.toISOString()
                : String(item.paymentDeadline))
            : null,
          paymentDate: item.paymentDate
            ? (item.paymentDate instanceof Date
                ? item.paymentDate.toISOString()
                : String(item.paymentDate))
            : null,
          stage: null,
          createdAt: item.createdAt instanceof Date
            ? item.createdAt.toISOString()
            : String(item.createdAt),
          source: "invoice" as const,
          costItemId: item.id,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
        })
      }
    }

    // Map VehicleStageCost to same shape, add source (serialize dates for JSON)
    const toDateStr = (d: Date | string | null | undefined) =>
      d
        ? d instanceof Date
          ? d.toISOString()
          : String(d)
        : null
    const stageCostsFormatted = vehicleStageCosts.map((c) => ({
      id: c.id,
      costType: c.costType,
      amount: c.amount,
      currency: c.currency,
      vendorId: c.vendorId,
      vendor: c.vendor,
      paymentDeadline: toDateStr(c.paymentDeadline),
      paymentDate: toDateStr(c.paymentDate),
      stage: c.stage,
      invoiceUrl: c.invoiceUrl,
      createdAt: toDateStr(c.createdAt),
      source: "vehicle" as const,
    }))

    const combined = [...invoiceCostItems, ...stageCostsFormatted].sort(
      (a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      }
    )

    return NextResponse.json(convertDecimalsToNumbers(combined))
  } catch (error) {
    console.error("Error fetching costs:", error)
    return NextResponse.json(
      { error: "Failed to fetch costs" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const { stage, costType, amount, vendorId, currency, paymentDeadline, paymentDate, invoiceUrl } = body

    if (!costType || !amount || !vendorId) {
      return NextResponse.json(
        { error: "Cost type, amount, and vendor are required" },
        { status: 400 }
      )
    }

    // Validate vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
    })
    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      )
    }

    // Validate vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    })
    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 400 }
      )
    }

    // Parse and validate amount
    const parsedAmount = parseFloat(String(amount))
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Must be a positive number" },
        { status: 400 }
      )
    }

    const cost = await prisma.vehicleStageCost.create({
      data: {
        vehicleId: params.id,
        stage: stage || null, // Stage is optional for unified expenses
        costType,
        amount: parsedAmount,
        vendorId,
        currency: currency || "JPY",
        paymentDeadline: paymentDeadline ? new Date(paymentDeadline) : null,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        invoiceUrl: invoiceUrl || null,
      },
      include: {
        vendor: true,
      },
    })

    return NextResponse.json(cost, { status: 201 })
  } catch (error: any) {
    console.error("Error creating cost:", error)
    
    // Return more specific error messages
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "Invalid vendor or vehicle reference" },
        { status: 400 }
      )
    }
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A cost with these details already exists" },
        { status: 409 }
      )
    }
    
    // Return the actual error message if available
    const errorMessage = error?.message || "Failed to create cost"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
