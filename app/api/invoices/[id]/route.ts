import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth, canEditInvoice, canViewAllInquiries, canDeleteInvoice } from "@/lib/permissions"
import { InvoiceStatus } from "@prisma/client"
import { convertDecimalsToNumbers } from "@/lib/decimal"
import { recalcInvoicePaymentStatus } from "@/lib/invoice-utils"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        vehicle: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        finalizedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        charges: {
          // Remove chargeType include - it's not commonly used and adds overhead
          select: {
            id: true,
            description: true,
            amount: true,
            chargeTypeId: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        costInvoice: {
          select: {
            id: true,
            totalCost: true,
            totalRevenue: true,
            profit: true,
            margin: true,
            roi: true,
            // Only load costItems if needed (can be lazy-loaded)
            costItems: {
              select: {
                id: true,
                description: true,
                amount: true,
                vendorId: true,
                paymentDate: true,
                paymentDeadline: true,
                category: true,
                vendor: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    // Check permissions
    const canViewAll = canViewAllInquiries(user.role)
    if (!canViewAll && invoice.createdById !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Convert Decimal values to numbers
    const convertedInvoice = convertDecimalsToNumbers(invoice)
    return NextResponse.json(convertedInvoice)
  } catch (error) {
    console.error("Error fetching invoice:", error)
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
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
    const {
      customerId,
      vehicleId,
      status,
      issueDate,
      dueDate,
      taxEnabled,
      taxRate,
      notes,
      customerUsesInJapan,
      charges,
      wisePaymentLink,
    } = body

    const updateData: any = {}
    if (customerId !== undefined) updateData.customerId = customerId
    if (vehicleId !== undefined) updateData.vehicleId = vehicleId
    if (status !== undefined) {
      // Staff and managers: automatically set to PENDING_APPROVAL when updating (unless admin)
      if (user.role === "ADMIN") {
        updateData.status = status as InvoiceStatus
      } else {
        // Only allow setting to PENDING_APPROVAL for staff/managers
        updateData.status = InvoiceStatus.PENDING_APPROVAL
      }
    }
    if (issueDate !== undefined)
      updateData.issueDate = new Date(issueDate)
    if (dueDate !== undefined)
      updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (taxEnabled !== undefined) updateData.taxEnabled = taxEnabled
    if (taxRate !== undefined) updateData.taxRate = parseFloat(taxRate)
    if (notes !== undefined) updateData.notes = notes || null
    if (customerUsesInJapan !== undefined)
      updateData.customerUsesInJapan = customerUsesInJapan
    if (wisePaymentLink !== undefined)
      updateData.wisePaymentLink = wisePaymentLink || null

    // Sync customerId/vehicleId changes to vehicle
    if (customerId !== undefined || vehicleId !== undefined) {
      const currentInvoice = await prisma.invoice.findUnique({
        where: { id: params.id },
        select: { vehicleId: true, customerId: true },
      })
      
      const finalVehicleId = vehicleId !== undefined ? vehicleId : currentInvoice?.vehicleId
      const finalCustomerId = customerId !== undefined ? customerId : currentInvoice?.customerId
      
      // Update vehicle's customerId if invoice customerId changed
      if (finalVehicleId && finalCustomerId !== undefined) {
        await prisma.vehicle.update({
          where: { id: finalVehicleId },
          data: { customerId: finalCustomerId || null },
        })
      }
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: true,
        vehicle: true,
        charges: {
          include: {
            chargeType: true,
          },
        },
      },
    })

    // Update charges if provided
    if (charges && Array.isArray(charges)) {
      // Delete existing charges
      await prisma.invoiceCharge.deleteMany({
        where: { invoiceId: params.id },
      })

      // Create new charges
      if (charges.length > 0) {
        // Get or create charge types
        const chargeTypeMap = new Map<string, string>()
        for (const charge of charges) {
          const chargeTypeName = charge.chargeType || "CUSTOM"
          if (!chargeTypeMap.has(chargeTypeName)) {
            let chargeType = await prisma.chargeType.findFirst({
              where: { name: chargeTypeName },
            })
            if (!chargeType) {
              chargeType = await prisma.chargeType.create({
                data: { name: chargeTypeName },
              })
            }
            chargeTypeMap.set(chargeTypeName, chargeType.id)
          }
        }

        // Create charges
        await prisma.invoiceCharge.createMany({
          data: charges.map((charge: any) => ({
            invoiceId: params.id,
            chargeTypeId: chargeTypeMap.get(charge.chargeType || "CUSTOM") || null,
            description: charge.description,
            amount: parseFloat(charge.amount),
          })),
        })
      }

      await recalcInvoicePaymentStatus(params.id)

      // Fetch updated invoice with charges
      const invoiceWithCharges = await prisma.invoice.findUnique({
        where: { id: params.id },
        include: {
          customer: true,
          vehicle: true,
          charges: {
            include: {
              chargeType: true,
            },
          },
        },
      })

      return NextResponse.json(convertDecimalsToNumbers(invoiceWithCharges))
    }

    return NextResponse.json(convertDecimalsToNumbers(updatedInvoice))
  } catch (error) {
    console.error("Error updating invoice:", error)
    return NextResponse.json(
      { error: "Failed to update invoice" },
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

    if (!canDeleteInvoice(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    // Admin can delete any invoice regardless of status
    await prisma.invoice.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting invoice:", error)
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    )
  }
}
