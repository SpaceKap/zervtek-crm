import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth, canCreateInvoice, canViewAllInquiries } from "@/lib/permissions"

// Copy container costs from shared invoice to each vehicle's cost invoice
async function copyContainerCostsToVehicleCostInvoices(containerInvoiceId: string) {
  const containerInvoice = await prisma.containerInvoice.findUnique({
    where: { id: containerInvoiceId },
    include: {
      sharedInvoice: {
        include: {
          vehicles: true,
        },
      },
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

  if (!containerInvoice) return

  // For each vehicle in the container invoice
  for (const containerVehicle of containerInvoice.vehicles) {
    // Find the corresponding shared invoice vehicle allocation (cost amount)
    const sharedVehicle = containerInvoice.sharedInvoice.vehicles.find(
      (sv) => sv.vehicleId === containerVehicle.vehicleId
    )

    if (!sharedVehicle) continue

    // Get all invoices for this vehicle
    const vehicleInvoices = containerVehicle.vehicle.invoices

    // For each invoice, ensure cost invoice exists and add container cost
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

      // Check if container cost already exists for this shared invoice
      const existingCost = await prisma.costItem.findFirst({
        where: {
          costInvoiceId: costInvoice.id,
          description: {
            contains: containerInvoice.sharedInvoice.invoiceNumber,
          },
          category: "Freight",
        },
      })

      if (!existingCost) {
        // Get vendorId from shared invoice metadata
        const metadata = containerInvoice.sharedInvoice.metadata as any
        const vendorId = metadata?.vendorId

        if (!vendorId) {
          console.error(`Shared invoice ${containerInvoice.sharedInvoice.id} is missing vendorId in metadata`)
          continue // Skip this vehicle if vendorId is missing
        }

        // Add container cost to cost invoice
        await prisma.costItem.create({
          data: {
            costInvoiceId: costInvoice.id,
            description: `Container Freight (${containerInvoice.sharedInvoice.invoiceNumber})`,
            amount: sharedVehicle.allocatedAmount, // Use the cost amount from shared invoice
            category: "Freight",
            vendorId: vendorId,
            paymentDate: containerInvoice.sharedInvoice.date,
            paymentDeadline: containerInvoice.sharedInvoice.paymentDeadline,
          },
        })

        // Recalculate cost invoice totals
        const costItems = await prisma.costItem.findMany({
          where: { costInvoiceId: costInvoice.id },
        })

        // Get shared invoice costs (forwarder and container)
        const sharedCosts = await prisma.sharedInvoiceVehicle.findMany({
          where: { vehicleId: containerVehicle.vehicleId },
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
}

// Generate container invoice number: CONTAINER-YYYY-XXX
async function generateContainerInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `CONTAINER-${year}-`

  // Find the highest invoice number for this year
  const lastInvoice = await prisma.containerInvoice.findFirst({
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
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customer")
    const sharedInvoiceId = searchParams.get("sharedInvoice")

    const canViewAll = canViewAllInquiries(user.role)

    const where: any = {}
    if (customerId) {
      where.customerId = customerId
    }
    if (sharedInvoiceId) {
      where.sharedInvoiceId = sharedInvoiceId
    }
    if (!canViewAll) {
      // Sales can only see invoices for customers they've created invoices for
      // This is a simplified check - in production, you might want more granular permissions
      where.customer = {
        invoices: {
          some: {
            createdById: user.id,
          },
        },
      }
    }

    const containerInvoices = await prisma.containerInvoice.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sharedInvoice: {
          select: {
            id: true,
            invoiceNumber: true,
            type: true,
            totalAmount: true,
            date: true,
          },
        },
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
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json(containerInvoices)
  } catch (error) {
    console.error("Error fetching container invoices:", error)
    return NextResponse.json(
      { error: "Failed to fetch container invoices" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    if (!canCreateInvoice(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const {
      customerId,
      sharedInvoiceId,
      issueDate,
      dueDate,
      taxEnabled,
      taxRate,
      notes,
      vehicles, // Array of { vehicleId, allocatedAmount }
    } = body

    if (!customerId || !sharedInvoiceId || !vehicles || vehicles.length === 0) {
      return NextResponse.json(
        { error: "Customer, shared invoice, and vehicles are required" },
        { status: 400 }
      )
    }

    // Verify shared invoice exists and is CONTAINER type
    const sharedInvoice = await prisma.sharedInvoice.findUnique({
      where: { id: sharedInvoiceId },
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

    if (sharedInvoice.type !== "CONTAINER") {
      return NextResponse.json(
        { error: "Shared invoice must be CONTAINER type" },
        { status: 400 }
      )
    }

    // Calculate total amount from vehicle allocations
    const totalAmount = vehicles.reduce(
      (sum: number, v: any) => sum + parseFloat(v.allocatedAmount || 0),
      0
    )

    const invoiceNumber = await generateContainerInvoiceNumber()

    const containerInvoice = await prisma.containerInvoice.create({
      data: {
        invoiceNumber,
        customerId,
        sharedInvoiceId,
        totalAmount,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        taxEnabled: taxEnabled || false,
        taxRate: taxRate ? parseFloat(taxRate.toString()) : 10,
        notes: notes || null,
        vehicles: {
          create: vehicles.map((v: any) => ({
            vehicleId: v.vehicleId,
            allocatedAmount: parseFloat(v.allocatedAmount || 0),
          })),
        },
      },
      include: {
        customer: true,
        sharedInvoice: {
          include: {
            vehicles: true,
          },
        },
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

    // Copy costs from shared invoice to each vehicle's cost invoice
    await copyContainerCostsToVehicleCostInvoices(containerInvoice.id)

    return NextResponse.json(containerInvoice, { status: 201 })
  } catch (error) {
    console.error("Error creating container invoice:", error)
    return NextResponse.json(
      { error: "Failed to create container invoice" },
      { status: 500 }
    )
  }
}
