import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageVehicleStages } from "@/lib/permissions"
import { getChargesSubtotal } from "@/lib/charge-utils"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        shippingStage: {
          select: {
            totalCharges: true,
            totalReceived: true,
          },
        },
        invoices: {
          where: { status: "FINALIZED" },
          select: {
            id: true,
            invoiceNumber: true,
            charges: {
              select: {
                id: true,
                description: true,
                amount: true,
                chargeType: { select: { name: true } },
              },
            },
            paymentStatus: true,
            taxEnabled: true,
            taxRate: true,
            costInvoice: {
              select: {
                costItems: {
                  select: { amount: true },
                },
              },
            },
          },
        },
        stageCosts: {
          select: {
            id: true,
            amount: true,
          },
        },
        sharedInvoiceVehicles: {
          select: {
            id: true,
            allocatedAmount: true,
            sharedInvoice: {
              select: {
                id: true,
                type: true,
                invoiceNumber: true,
              },
            },
          },
        },
      },
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      )
    }

    // Calculate total revenue from finalized invoices (including tax) - discounts/deposits subtract
    let totalRevenue = 0
    vehicle.invoices.forEach((invoice) => {
      const chargesTotal = getChargesSubtotal(invoice.charges)
      let subtotal = chargesTotal
      if (invoice.taxEnabled && invoice.taxRate) {
        const taxRate = parseFloat(invoice.taxRate.toString())
        const taxAmount = subtotal * (taxRate / 100)
        subtotal += taxAmount
      }
      totalRevenue += subtotal
    })

    // Calculate total cost from stage costs, shared invoice allocations, and invoice cost breakdown
    const stageCostsTotal = vehicle.stageCosts.reduce(
      (sum, cost) => sum + parseFloat(cost.amount.toString()),
      0,
    )
    const sharedInvoiceCostsTotal = vehicle.sharedInvoiceVehicles.reduce(
      (sum, siv) => sum + parseFloat(siv.allocatedAmount.toString()),
      0,
    )
    const invoiceCostItemsTotal = vehicle.invoices.reduce((sum, inv) => {
      const items = (inv as any).costInvoice?.costItems || []
      return sum + items.reduce((s: number, item: any) => s + parseFloat(item.amount.toString()), 0)
    }, 0)
    const totalCost = stageCostsTotal + sharedInvoiceCostsTotal + invoiceCostItemsTotal

    // Calculate profit and margin
    const profit = totalRevenue - totalCost
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0

    // Legacy fields for backward compatibility
    const totalCharges = vehicle.shippingStage?.totalCharges 
      ? parseFloat(vehicle.shippingStage.totalCharges.toString()) 
      : 0
    const totalReceived = vehicle.shippingStage?.totalReceived 
      ? parseFloat(vehicle.shippingStage.totalReceived.toString()) 
      : 0
    const balanceDue = totalCharges - totalReceived

    return NextResponse.json({
      totalRevenue: totalRevenue.toString(),
      totalCost: totalCost.toString(),
      profit: profit.toString(),
      margin: margin.toFixed(2),
      totalCharges: totalCharges.toString(),
      totalReceived: totalReceived.toString(),
      balanceDue: balanceDue.toString(),
      invoices: vehicle.invoices,
    })
  } catch (error) {
    console.error("Error fetching vehicle payments:", error)
    return NextResponse.json(
      { error: "Failed to fetch vehicle payments" },
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

    if (!canManageVehicleStages(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { totalCharges, totalReceived } = body

    const updateData: any = {}
    if (totalCharges !== undefined) {
      updateData.totalCharges = parseFloat(totalCharges)
    }
    if (totalReceived !== undefined) {
      updateData.totalReceived = parseFloat(totalReceived)
    }

    const stage = await prisma.vehicleShippingStage.upsert({
      where: { vehicleId: params.id },
      update: updateData,
      create: {
        vehicleId: params.id,
        stage: "PAYMENT",
        ...updateData,
      },
    })

    return NextResponse.json(stage)
  } catch (error) {
    console.error("Error updating vehicle payments:", error)
    return NextResponse.json(
      { error: "Failed to update vehicle payments" },
      { status: 500 }
    )
  }
}
