import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth, canEditInvoice } from "@/lib/permissions"
import { convertDecimalsToNumbers } from "@/lib/decimal"

function calculateProfitMetrics(
  totalRevenue: number,
  totalCost: number
): { profit: number; margin: number; roi: number } {
  const profit = totalRevenue - totalCost
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0

  return {
    profit: Math.round(profit * 100) / 100,
    margin: Math.round(margin * 100) / 100,
    roi: Math.round(roi * 100) / 100,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()

    const costInvoice = await prisma.costInvoice.findUnique({
      where: { invoiceId: params.id },
      include: {
        costItems: {
          include: {
            vendor: true,
          },
          orderBy: { createdAt: "asc" },
        },
        invoice: {
          include: {
            charges: true,
            vehicle: {
              include: {
                sharedInvoiceVehicles: {
                  include: {
                    sharedInvoice: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!costInvoice) {
      return NextResponse.json(
        { error: "Cost invoice not found" },
        { status: 404 }
      )
    }

    // Get shared invoice costs for this vehicle
    const forwarderCosts = costInvoice.invoice.vehicle.sharedInvoiceVehicles
      .filter((siv) => siv.sharedInvoice.type === "FORWARDER")
      .map((siv) => ({
        id: `shared-forwarder-${siv.id}`,
        description: `Forwarder Fee (${siv.sharedInvoice.invoiceNumber})`,
        amount: parseFloat(siv.allocatedAmount.toString()),
        vendorId: null,
        vendor: null,
        paymentDate: siv.sharedInvoice.date ? siv.sharedInvoice.date.toISOString().split("T")[0] : null,
        paymentDeadline: siv.sharedInvoice.paymentDeadline.toISOString().split("T")[0],
        category: "Forwarding",
        createdAt: siv.createdAt,
        updatedAt: siv.createdAt,
        costInvoiceId: costInvoice.id,
        // Store metadata for shared invoice items to enable edit/delete
        sharedInvoiceId: siv.sharedInvoiceId,
        vehicleId: siv.vehicleId,
      }))

    const containerCosts = costInvoice.invoice.vehicle.sharedInvoiceVehicles
      .filter((siv) => siv.sharedInvoice.type === "CONTAINER")
      .map((siv) => ({
        id: `shared-container-${siv.id}`,
        description: `Container Freight (${siv.sharedInvoice.invoiceNumber})`,
        amount: parseFloat(siv.allocatedAmount.toString()),
        vendorId: null,
        vendor: null,
        paymentDate: siv.sharedInvoice.date ? siv.sharedInvoice.date.toISOString().split("T")[0] : null,
        paymentDeadline: siv.sharedInvoice.paymentDeadline.toISOString().split("T")[0],
        category: "Freight",
        createdAt: siv.createdAt,
        updatedAt: siv.createdAt,
        costInvoiceId: costInvoice.id,
        // Store metadata for shared invoice items to enable edit/delete
        sharedInvoiceId: siv.sharedInvoiceId,
        vehicleId: siv.vehicleId,
      }))

    const sharedInvoiceCosts = [...forwarderCosts, ...containerCosts]

    // Combine regular cost items with shared invoice costs
    const allCostItems = [
      ...costInvoice.costItems.map((item) => ({
        ...item,
        amount: parseFloat(item.amount.toString()),
      })),
      ...sharedInvoiceCosts,
    ]

    // Recalculate totals including shared invoice costs
    const totalCost = allCostItems.reduce(
      (sum, item) => sum + item.amount,
      0
    )

    // Calculate revenue including tax (tax is revenue, not a cost)
    let revenue = parseFloat(costInvoice.totalRevenue.toString())
    if (costInvoice.invoice.taxEnabled && costInvoice.invoice.taxRate) {
      // Calculate subtotal from charges
      const subtotal = costInvoice.invoice.charges?.reduce(
        (sum: number, charge: any) => sum + parseFloat(charge.amount.toString()),
        0
      ) || revenue
      
      // Add tax to revenue
      const taxRate = parseFloat(costInvoice.invoice.taxRate.toString())
      const taxAmount = subtotal * (taxRate / 100)
      revenue = subtotal + taxAmount
    }

    const metrics = calculateProfitMetrics(
      revenue,
      totalCost
    )

    const response = {
      ...costInvoice,
      costItems: allCostItems,
      totalCost,
      profit: metrics.profit,
      margin: metrics.margin,
      roi: metrics.roi,
    }
    
    return NextResponse.json(convertDecimalsToNumbers(response))
  } catch (error) {
    console.error("Error fetching cost invoice:", error)
    return NextResponse.json(
      { error: "Failed to fetch cost invoice" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    if (!canEditInvoice(invoice.status, user.role, invoice.isLocked)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { totalRevenue, costItems } = body

    // Calculate total cost from items
    const totalCost =
      costItems?.reduce(
        (sum: number, item: any) => sum + parseFloat(item.amount || 0),
        0
      ) || 0

    const metrics = calculateProfitMetrics(
      parseFloat(totalRevenue || 0),
      totalCost
    )

    // Check if cost invoice exists
    const existing = await prisma.costInvoice.findUnique({
      where: { invoiceId: params.id },
    })

    const costInvoice = existing
      ? await prisma.costInvoice.update({
          where: { invoiceId: params.id },
          data: {
            totalRevenue: parseFloat(totalRevenue || 0),
            totalCost,
            profit: metrics.profit,
            margin: metrics.margin,
            roi: metrics.roi,
          },
          include: {
            costItems: {
              include: {
                vendor: true,
              },
            },
          },
        })
      : await prisma.costInvoice.create({
          data: {
            invoiceId: params.id,
            totalRevenue: parseFloat(totalRevenue || 0),
            totalCost,
            profit: metrics.profit,
            margin: metrics.margin,
            roi: metrics.roi,
          },
          include: {
            costItems: {
              include: {
                vendor: true,
              },
            },
          },
        })

    return NextResponse.json(convertDecimalsToNumbers(costInvoice))
  } catch (error) {
    console.error("Error creating/updating cost invoice:", error)
    return NextResponse.json(
      { error: "Failed to create/update cost invoice" },
      { status: 500 }
    )
  }
}
