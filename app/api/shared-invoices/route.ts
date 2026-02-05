import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth, canViewAllInquiries } from "@/lib/permissions"
import { Prisma } from "@prisma/client"
import { convertDecimalsToNumbers } from "@/lib/decimal"

// Generate shared invoice number: TYPE-YYYY-XXX
async function generateSharedInvoiceNumber(
  type: string
): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `${type}-${year}-`

  const lastInvoice = await prisma.sharedInvoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: "desc",
    },
  })

  let nextNumber = 1
  if (lastInvoice) {
    const lastNumber = parseInt(
      lastInvoice.invoiceNumber.replace(prefix, ""),
      10
    )
    nextNumber = lastNumber + 1
  }

  return `${prefix}${nextNumber.toString().padStart(3, "0")}`
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    // Sales staff and managers can view shared invoices (they can create them too)
    // No restriction needed here

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    const where: any = {}
    if (type) {
      where.type = type
    }

    // Add pagination for shared invoices
    const page = parseInt(request.nextUrl.searchParams.get("page") || "1")
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    const sharedInvoices = await prisma.sharedInvoice.findMany({
      where,
      select: {
        id: true,
        type: true,
        invoiceNumber: true,
        totalAmount: true,
        date: true,
        paymentDeadline: true,
        createdAt: true,
        updatedAt: true,
        vehicles: {
          select: {
            id: true,
            vehicleId: true,
            allocatedAmount: true,
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
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    })

    const total = await prisma.sharedInvoice.count({ where })

    return NextResponse.json({
      sharedInvoices: convertDecimalsToNumbers(sharedInvoices),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching shared invoices:", error)
    return NextResponse.json(
      { error: "Failed to fetch shared invoices" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    // Sales staff and managers can create shared invoices
    // No restriction needed - all authenticated users can create

    const body = await request.json()
    const { type, totalAmount, date, paymentDeadline, vehicleIds, vendorId, costItems } = body

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { error: "Type is required" },
        { status: 400 }
      )
    }

    if (!totalAmount || isNaN(parseFloat(totalAmount)) || parseFloat(totalAmount) <= 0) {
      return NextResponse.json(
        { error: "Valid total amount is required" },
        { status: 400 }
      )
    }

    if (!paymentDeadline) {
      return NextResponse.json(
        { error: "Payment deadline is required" },
        { status: 400 }
      )
    }

    if (!vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      return NextResponse.json(
        { error: "At least one vehicle is required" },
        { status: 400 }
      )
    }

    // Validate vehicle IDs exist
    const vehicleCount = await prisma.vehicle.count({
      where: {
        id: { in: vehicleIds },
      },
    })

    if (vehicleCount !== vehicleIds.length) {
      return NextResponse.json(
        { error: "One or more vehicle IDs are invalid" },
        { status: 400 }
      )
    }

    const invoiceNumber = await generateSharedInvoiceNumber(type)

    // Calculate allocated amount per vehicle (equal split)
    const allocatedAmount = parseFloat(totalAmount) / vehicleIds.length

    // Validate vendorId is required
    if (!vendorId) {
      return NextResponse.json(
        { error: "Vendor is required" },
        { status: 400 }
      )
    }

    // Build metadata object - always include vendorId and costItems
    const metadata: any = {
      vendorId: vendorId,
    }
    if (costItems && Array.isArray(costItems)) {
      metadata.costItems = costItems.map((item: any) => ({
        description: item.description || "",
        amount: typeof item.amount === "string" ? item.amount : String(item.amount || ""),
      }))
    }

    const createData: any = {
      type: type,
      invoiceNumber,
      totalAmount: parseFloat(totalAmount),
      date: date ? new Date(date) : null,
      paymentDeadline: new Date(paymentDeadline),
      vehicles: {
        create: vehicleIds.map((vehicleId: string) => ({
          vehicleId,
          allocatedAmount: Math.round(allocatedAmount * 100) / 100,
        })),
      },
    }

    // Only include metadata if it has content
    if (Object.keys(metadata).length > 0) {
      createData.metadata = metadata
    }

    const sharedInvoice = await prisma.sharedInvoice.create({
      data: createData,
      include: {
        vehicles: {
          include: {
            vehicle: true,
          },
        },
      },
    })

    // Apply allocated amounts to cost invoices
    // This ensures costs are divided and available in each vehicle's cost invoice
    await applySharedInvoiceToCostInvoices(sharedInvoice.id)

    return NextResponse.json(convertDecimalsToNumbers(sharedInvoice), { status: 201 })
  } catch (error: any) {
    console.error("Error creating shared invoice:", error)
    
    // Provide more detailed error messages
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Invoice number already exists" },
          { status: 400 }
        )
      }
      if (error.code === "P2003") {
        return NextResponse.json(
          { error: "Invalid vehicle ID or foreign key constraint violation" },
          { status: 400 }
        )
      }
      if (error.code === "P2012") {
        return NextResponse.json(
          { error: "Missing required field" },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        error: "Failed to create shared invoice",
        details: error.message || String(error)
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()
    // Sales staff and managers can edit shared invoices
    // No restriction needed - all authenticated users can edit

    const body = await request.json()
    const { id, type, totalAmount, date, paymentDeadline, vehicleIds, costItems, vendorId } = body

    if (!id) {
      return NextResponse.json(
        { error: "Shared invoice ID is required" },
        { status: 400 }
      )
    }

    const sharedInvoice = await prisma.sharedInvoice.findUnique({
      where: { id },
      include: {
        vehicles: true,
      },
    })

    if (!sharedInvoice) {
      return NextResponse.json(
        { error: "Shared invoice not found" },
        { status: 404 }
      )
    }

    // Update basic fields
    const updateData: any = {}
    if (type !== undefined) updateData.type = type
    if (totalAmount !== undefined)
      updateData.totalAmount = parseFloat(totalAmount)
    if (date !== undefined) updateData.date = date ? new Date(date) : null
    if (paymentDeadline !== undefined) updateData.paymentDeadline = new Date(paymentDeadline)
    
    // Validate vendorId is required if updating
    if (vendorId !== undefined && !vendorId) {
      return NextResponse.json(
        { error: "Vendor is required" },
        { status: 400 }
      )
    }

    // Update metadata (vendorId and costItems)
    if (vendorId !== undefined || costItems !== undefined) {
      const currentMetadata = (sharedInvoice.metadata as any) || {}
      const newMetadata: any = { ...currentMetadata }
      
      if (vendorId !== undefined) {
        newMetadata.vendorId = vendorId
      }
      
      if (costItems !== undefined && Array.isArray(costItems)) {
        newMetadata.costItems = costItems.map((item: any) => ({
          description: item.description || "",
          amount: typeof item.amount === "string" ? item.amount : String(item.amount || ""),
        }))
      }
      
      updateData.metadata = newMetadata
    }

    // If vehicleIds provided, update vehicles
    if (vehicleIds && Array.isArray(vehicleIds)) {
      // Delete existing vehicle links
      await prisma.sharedInvoiceVehicle.deleteMany({
        where: { sharedInvoiceId: id },
      })

      // Calculate allocated amount
      const allocatedAmount = parseFloat(totalAmount || sharedInvoice.totalAmount.toString()) / vehicleIds.length

      // Create new vehicle links
      await prisma.sharedInvoiceVehicle.createMany({
        data: vehicleIds.map((vehicleId: string) => ({
          sharedInvoiceId: id,
          vehicleId,
          allocatedAmount: Math.round(allocatedAmount * 100) / 100,
        })),
      })
    }

    const updated = await prisma.sharedInvoice.update({
      where: { id },
      data: updateData,
      include: {
        vehicles: {
          include: {
            vehicle: true,
          },
        },
      },
    })

    // Recalculate cost invoices if vehicles were updated
    if (vehicleIds && Array.isArray(vehicleIds)) {
      await applySharedInvoiceToCostInvoices(id)
    }

    return NextResponse.json(convertDecimalsToNumbers(updated))
  } catch (error: any) {
    console.error("Error updating shared invoice:", error)
    return NextResponse.json(
      { 
        error: "Failed to update shared invoice",
        details: error.message || String(error)
      },
      { status: 500 }
    )
  }
}

async function applySharedInvoiceToCostInvoices(sharedInvoiceId: string) {
  // This function ensures that shared invoice costs are available to cost invoices
  // The costs are stored in SharedInvoiceVehicle and read by the cost invoice GET route
  // No need to create CostItems - the GET route handles this dynamically
  // This function can be used to trigger recalculation if needed
  const sharedInvoice = await prisma.sharedInvoice.findUnique({
    where: { id: sharedInvoiceId },
    include: {
      vehicles: {
        include: {
          vehicle: {
            include: {
              invoices: {
                include: {
                  costInvoice: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!sharedInvoice) return

    // Recalculate cost invoices for all affected vehicles
    // The costs are stored in SharedInvoiceVehicle and read dynamically by the GET route
    // We just need to ensure cost invoices exist and recalculate totals
    for (const sharedVehicle of sharedInvoice.vehicles) {
      const vehicleInvoices = sharedVehicle.vehicle.invoices

      for (const invoice of vehicleInvoices) {
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

        // Recalculate totals including shared invoice costs
        const costItems = await prisma.costItem.findMany({
          where: { costInvoiceId: costInvoice.id },
        })

        // Get all shared invoice costs for this vehicle
        const sharedCosts = await prisma.sharedInvoiceVehicle.findMany({
          where: { vehicleId: sharedVehicle.vehicleId },
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
