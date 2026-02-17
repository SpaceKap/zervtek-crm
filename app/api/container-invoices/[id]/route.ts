import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth, canEditInvoice, canViewAllInquiries } from "@/lib/permissions"
import { convertDecimalsToNumbers } from "@/lib/decimal"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    const containerInvoice = await prisma.containerInvoice.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        sharedInvoice: {
          include: {
            vehicles: {
              include: {
                vehicle: true,
              },
            },
          },
        },
        vehicles: {
          include: {
            vehicle: true,
          },
        },
      },
    })

    if (!containerInvoice) {
      return NextResponse.json(
        { error: "Container invoice not found" },
        { status: 404 }
      )
    }

    // Check permissions
    const canViewAll = canViewAllInquiries(user.role)
    if (!canViewAll) {
      // Sales can only see invoices for customers they've created invoices for
      const hasAccess = await prisma.invoice.findFirst({
        where: {
          customerId: containerInvoice.customerId,
          createdById: user.id,
        },
      })
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    return NextResponse.json(convertDecimalsToNumbers(containerInvoice))
  } catch (error) {
    console.error("Error fetching container invoice:", error)
    return NextResponse.json(
      { error: "Failed to fetch container invoice" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    const containerInvoice = await prisma.containerInvoice.findUnique({
      where: { id: params.id },
    })

    if (!containerInvoice) {
      return NextResponse.json(
        { error: "Container invoice not found" },
        { status: 404 }
      )
    }

    // Check permissions - simplified check, adjust as needed
    if (!canEditInvoice("DRAFT", user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const {
      issueDate,
      dueDate,
      taxEnabled,
      taxRate,
      notes,
      vehicles, // Array of { vehicleId, allocatedAmount }
    } = body

    // If vehicles are provided, update them
    if (vehicles && Array.isArray(vehicles)) {
      // Delete existing vehicle allocations
      await prisma.containerInvoiceVehicle.deleteMany({
        where: { containerInvoiceId: params.id },
      })

      // Create new vehicle allocations
      await prisma.containerInvoiceVehicle.createMany({
        data: vehicles.map((v: any) => ({
          containerInvoiceId: params.id,
          vehicleId: v.vehicleId,
          allocatedAmount: parseFloat(v.allocatedAmount || 0),
        })) as any, // Type assertion to bypass Prisma type checking
      })

      // Recalculate total amount
      const totalAmount = vehicles.reduce(
        (sum: number, v: any) => sum + parseFloat(v.allocatedAmount || 0),
        0
      )

      const updated = await prisma.containerInvoice.update({
        where: { id: params.id },
        data: {
          totalAmount,
          issueDate: issueDate ? new Date(issueDate) : undefined,
          dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
          taxEnabled: taxEnabled !== undefined ? taxEnabled : undefined,
          taxRate: taxRate !== undefined ? parseFloat(taxRate.toString()) : undefined,
          notes: notes !== undefined ? notes : undefined,
        },
        include: {
          customer: true,
          sharedInvoice: true,
          vehicles: {
            include: {
              vehicle: true,
            },
          },
        },
      })

      return NextResponse.json(convertDecimalsToNumbers(updated))
    } else {
      // Update without changing vehicles
      const updated = await prisma.containerInvoice.update({
        where: { id: params.id },
        data: {
          issueDate: issueDate ? new Date(issueDate) : undefined,
          dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
          taxEnabled: taxEnabled !== undefined ? taxEnabled : undefined,
          taxRate: taxRate !== undefined ? parseFloat(taxRate.toString()) : undefined,
          notes: notes !== undefined ? notes : undefined,
        },
        include: {
          customer: true,
          sharedInvoice: true,
          vehicles: {
            include: {
              vehicle: true,
            },
          },
        },
      })

      return NextResponse.json(convertDecimalsToNumbers(updated))
    }
  } catch (error) {
    console.error("Error updating container invoice:", error)
    return NextResponse.json(
      { error: "Failed to update container invoice" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    const containerInvoice = await prisma.containerInvoice.findUnique({
      where: { id: params.id },
    })

    if (!containerInvoice) {
      return NextResponse.json(
        { error: "Container invoice not found" },
        { status: 404 }
      )
    }

    // Check permissions - only admins can delete
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.containerInvoice.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting container invoice:", error)
    return NextResponse.json(
      { error: "Failed to delete container invoice" },
      { status: 500 }
    )
  }
}
