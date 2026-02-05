import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth, canViewAllInquiries, canDeleteSharedInvoice } from "@/lib/permissions"
import { convertDecimalsToNumbers } from "@/lib/decimal"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()

    const sharedInvoice = await prisma.sharedInvoice.findUnique({
      where: { id: params.id },
      include: {
        vehicles: {
          include: {
            vehicle: {
              select: {
                id: true,
                vin: true,
                make: true,
                model: true,
                year: true,
              },
            },
          },
        },
      },
    })

    if (!sharedInvoice) {
      return NextResponse.json(
        { error: "Shared invoice not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(convertDecimalsToNumbers(sharedInvoice))
  } catch (error) {
    console.error("Error fetching shared invoice:", error)
    return NextResponse.json(
      { error: "Failed to fetch shared invoice" },
      { status: 500 }
    )
  }
}

// Helper function to recalculate cost invoices for affected vehicles
async function recalculateCostInvoicesForVehicles(vehicleIds: string[]) {
  for (const vehicleId of vehicleIds) {
    // Get all invoices for this vehicle
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        invoices: {
          include: {
            costInvoice: true,
          },
        },
      },
    })

    if (!vehicle) continue

    for (const invoice of vehicle.invoices) {
      // Get or create cost invoice
      let costInvoice = invoice.costInvoice
      if (!costInvoice) {
        // Calculate revenue from invoice charges
        const charges = await prisma.invoiceCharge.findMany({
          where: { invoiceId: invoice.id },
        })
        const subtotal = charges.reduce(
          (sum, charge) => sum + parseFloat(charge.amount.toString()),
          0
        )
        const taxAmount = invoice.taxEnabled && invoice.taxRate
          ? subtotal * (parseFloat(invoice.taxRate.toString()) / 100)
          : 0
        const totalRevenue = subtotal + taxAmount

        costInvoice = await prisma.costInvoice.create({
          data: {
            invoiceId: invoice.id,
            totalRevenue,
            totalCost: 0,
            profit: totalRevenue,
            margin: 100,
            roi: 0,
          },
        })
      }

      // Recalculate totals including remaining shared invoice costs
      const costItems = await prisma.costItem.findMany({
        where: { costInvoiceId: costInvoice.id },
      })

      // Get all remaining shared invoice costs for this vehicle
      const sharedCosts = await prisma.sharedInvoiceVehicle.findMany({
        where: { vehicleId },
        include: { sharedInvoice: true },
      })

      const sharedCostAmount = sharedCosts.reduce(
        (sum, siv) => sum + parseFloat(siv.allocatedAmount.toString()),
        0
      )

      const regularCost = costItems.reduce(
        (sum, item) => sum + parseFloat(item.amount.toString()),
        0
      )
      const totalCost = regularCost + sharedCostAmount

      // Calculate revenue
      const charges = await prisma.invoiceCharge.findMany({
        where: { invoiceId: invoice.id },
      })
      const subtotal = charges.reduce(
        (sum, charge) => sum + parseFloat(charge.amount.toString()),
        0
      )
      const taxAmount = invoice.taxEnabled && invoice.taxRate
        ? subtotal * (parseFloat(invoice.taxRate.toString()) / 100)
        : 0
      const totalRevenue = subtotal + taxAmount

      const profit = totalRevenue - totalCost
      const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
      const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0

      await prisma.costInvoice.update({
        where: { id: costInvoice.id },
        data: {
          totalRevenue,
          totalCost,
          profit: Math.round(profit * 100) / 100,
          margin: Math.round(margin * 100) / 100,
          roi: Math.round(roi * 100) / 100,
        },
      })
    }
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    if (!canDeleteSharedInvoice(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get the shared invoice with vehicles before deleting
    const sharedInvoice = await prisma.sharedInvoice.findUnique({
      where: { id: params.id },
      include: {
        vehicles: true,
        containerInvoices: {
          select: { id: true },
        },
      },
    })

    if (!sharedInvoice) {
      return NextResponse.json(
        { error: "Shared invoice not found" },
        { status: 404 }
      )
    }

    // Check if there are container invoices linked to this shared invoice
    if (sharedInvoice.containerInvoices.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete shared invoice that has container invoices linked to it. Please delete the container invoices first.",
        },
        { status: 400 }
      )
    }

    // Get vehicle IDs before deletion for recalculation
    const vehicleIds = sharedInvoice.vehicles.map((v) => v.vehicleId)

    // Delete the shared invoice (cascade will delete SharedInvoiceVehicle records)
    await prisma.sharedInvoice.delete({
      where: { id: params.id },
    })

    // Recalculate cost invoices for affected vehicles
    await recalculateCostInvoicesForVehicles(vehicleIds)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting shared invoice:", error)
    return NextResponse.json(
      { error: "Failed to delete shared invoice" },
      { status: 500 }
    )
  }
}
