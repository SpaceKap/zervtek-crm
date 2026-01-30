import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"
import { UserRole } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Only admins and back-office staff can view transactions
    if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.BACK_OFFICE_STAFF
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    // Fetch all invoices with related data
    const invoices = await prisma.invoice.findMany({
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            vin: true,
            make: true,
            model: true,
            year: true,
          },
        },
        charges: {
          select: {
            id: true,
            description: true,
            amount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Fetch all cost items with payment dates (payments)
    // Note: paymentDate is required, so no need to filter for null
    const costItemPayments = await prisma.costItem.findMany({
      where: {},
      include: {
        costInvoice: {
          include: {
            invoice: {
              include: {
                customer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
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
        },
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { paymentDate: "desc" },
    })

    // Fetch all shared invoices (these are payments)
    const sharedInvoices = await prisma.sharedInvoice.findMany({
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
      orderBy: { date: "desc" },
    })

    // Transform invoices into transaction format
    const invoiceTransactions = invoices.map((invoice) => {
      const totalAmount = invoice.charges.reduce(
        (sum, charge) => sum + Number(charge.amount),
        0
      )

      return {
        id: invoice.id,
        type: "invoice" as const,
        date: invoice.createdAt,
        invoiceNumber: invoice.invoiceNumber,
        customer: invoice.customer,
        vehicle: invoice.vehicle,
        amount: totalAmount,
        status: invoice.status,
        description: `Invoice ${invoice.invoiceNumber}`,
      }
    })

    // Transform cost item payments into transaction format
    const costItemPaymentTransactions = costItemPayments.map((payment) => {
      return {
        id: payment.id,
        type: "payment" as const,
        date: payment.paymentDate!,
        invoiceNumber: payment.costInvoice.invoice.invoiceNumber,
        customer: payment.costInvoice.invoice.customer,
        vehicle: payment.costInvoice.invoice.vehicle,
        amount: Number(payment.amount),
        vendor: payment.vendor,
        description: payment.description,
        category: payment.category,
      }
    })

    // Transform shared invoices into payment transactions
    // Each shared invoice creates one payment transaction per vehicle
    const sharedInvoicePaymentTransactions = sharedInvoices.flatMap((sharedInvoice) => {
      const allocatedAmount = sharedInvoice.vehicles.length > 0
        ? Number(sharedInvoice.totalAmount) / sharedInvoice.vehicles.length
        : 0

      return sharedInvoice.vehicles.map((sv) => ({
        id: `shared-${sharedInvoice.id}-${sv.vehicleId}`,
        type: "payment" as const,
        date: sharedInvoice.date,
        invoiceNumber: sharedInvoice.invoiceNumber,
        customer: null, // Shared invoices don't have a customer
        vehicle: sv.vehicle,
        amount: allocatedAmount,
        vendor: null,
        description: `${sharedInvoice.type === "CONTAINER" ? "Container" : sharedInvoice.type === "FORWARDER" ? "Forwarder" : sharedInvoice.type} Fee (${sharedInvoice.invoiceNumber})`,
        category: sharedInvoice.type === "CONTAINER" ? "Shipping" : "Forwarding",
        sharedInvoiceId: sharedInvoice.id,
      }))
    })

    // Combine all transactions and sort by date (most recent first)
    const allTransactions = [
      ...invoiceTransactions,
      ...costItemPaymentTransactions,
      ...sharedInvoicePaymentTransactions,
    ].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    return NextResponse.json(allTransactions)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    )
  }
}
