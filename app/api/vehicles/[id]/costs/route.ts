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
          paymentDeadline: item.paymentDeadline,
          paymentDate: item.paymentDate,
          stage: null,
          createdAt: item.createdAt,
          source: "invoice" as const,
          costItemId: item.id,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
        })
      }
    }

    // Map VehicleStageCost to same shape, add source
    const stageCostsFormatted = vehicleStageCosts.map((c) => ({
      id: c.id,
      costType: c.costType,
      amount: c.amount,
      currency: c.currency,
      vendorId: c.vendorId,
      vendor: c.vendor,
      paymentDeadline: c.paymentDeadline,
      paymentDate: c.paymentDate,
      stage: c.stage,
      createdAt: c.createdAt,
      source: "vehicle" as const,
    }))

    const combined = [...invoiceCostItems, ...stageCostsFormatted].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
    const { stage, costType, amount, vendorId, currency, paymentDeadline, paymentDate } = body

    if (!costType || !amount || !vendorId) {
      return NextResponse.json(
        { error: "Cost type, amount, and vendor are required" },
        { status: 400 }
      )
    }

    const cost = await prisma.vehicleStageCost.create({
      data: {
        vehicleId: params.id,
        stage: stage || null, // Stage is optional for unified expenses
        costType,
        amount: parseFloat(amount),
        vendorId,
        currency: currency || "JPY",
        paymentDeadline: paymentDeadline ? new Date(paymentDeadline) : null,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
      },
      include: {
        vendor: true,
      },
    })

    return NextResponse.json(cost, { status: 201 })
  } catch (error) {
    console.error("Error creating cost:", error)
    return NextResponse.json(
      { error: "Failed to create cost" },
      { status: 500 }
    )
  }
}
