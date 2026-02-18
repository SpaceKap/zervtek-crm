import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canViewTransactions, canManageTransactions } from "@/lib/permissions"
import { TransactionDirection, TransactionType } from "@prisma/client"
import { convertDecimalsToNumbers } from "@/lib/decimal"
import {
  getInvoiceTotalWithTax,
  isAmountPaidInFull,
  hasPartialPayment,
} from "@/lib/invoice-utils"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canViewTransactions(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const direction = searchParams.get("direction") as TransactionDirection | null
    const type = searchParams.get("type") as TransactionType | null
    const vendorId = searchParams.get("vendorId")
    const customerId = searchParams.get("customerId")
    const vehicleId = searchParams.get("vehicleId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: any = {}
    if (direction) {
      where.direction = direction
    }
    if (type) {
      where.type = type
    }
    if (vendorId) {
      where.vendorId = vendorId
    }
    if (customerId) {
      where.customerId = customerId
    }
    if (vehicleId) {
      where.vehicleId = vehicleId
    }
    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        where.date.gte = new Date(startDate)
      }
      if (endDate) {
        where.date.lte = new Date(endDate)
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        vendor: true,
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
          },
        },
        invoice: {
          select: {
            invoiceNumber: true,
          },
        },
      },
      orderBy: { date: "desc" },
      take: 500,
    })

    // Also fetch general costs and combine them with transactions
    const generalCostsWhere: any = {}
    if (startDate || endDate) {
      generalCostsWhere.date = {}
      if (startDate) {
        generalCostsWhere.date.gte = new Date(startDate)
      }
      if (endDate) {
        generalCostsWhere.date.lte = new Date(endDate)
      }
    }
    if (vendorId) {
      generalCostsWhere.vendorId = vendorId
    }

    const generalCosts = await prisma.generalCost.findMany({
      where: generalCostsWhere,
      include: {
        vendor: true,
      },
      orderBy: { date: "desc" },
      take: 500,
    })

    // Transform general costs to transaction-like format
    const generalCostsAsTransactions = generalCosts.map((cost) => ({
      id: cost.id,
      direction: "OUTGOING" as TransactionDirection,
      type: "BANK_TRANSFER" as TransactionType, // Default type for general costs
      amount: cost.amount,
      currency: cost.currency,
      date: cost.date ? (cost.date instanceof Date ? cost.date.toISOString() : new Date(cost.date).toISOString()) : new Date().toISOString(),
      description: cost.description,
      vendorId: cost.vendorId,
      customerId: null,
      vehicleId: null,
      invoiceId: null,
      invoiceUrl: cost.invoiceUrl,
      documentId: cost.documentId,
      referenceNumber: null,
      notes: cost.notes,
      createdById: cost.createdById,
      createdAt: cost.createdAt instanceof Date ? cost.createdAt.toISOString() : new Date(cost.createdAt).toISOString(),
      updatedAt: cost.updatedAt instanceof Date ? cost.updatedAt.toISOString() : new Date(cost.updatedAt).toISOString(),
      vendor: cost.vendor,
      customer: null,
      vehicle: null,
      isGeneralCost: true, // Flag to identify general costs
    }))

    // Also fetch vehicle stage costs and combine them with transactions
    const vehicleStageCostsWhere: any = {}
    if (vehicleId) {
      vehicleStageCostsWhere.vehicleId = vehicleId
    }
    if (vendorId) {
      vehicleStageCostsWhere.vendorId = vendorId
    }
    if (startDate || endDate) {
      vehicleStageCostsWhere.createdAt = {}
      if (startDate) {
        vehicleStageCostsWhere.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        vehicleStageCostsWhere.createdAt.lte = new Date(endDate)
      }
    }

    const vehicleStageCosts = await prisma.vehicleStageCost.findMany({
      where: vehicleStageCostsWhere,
      include: {
        vendor: true,
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
      orderBy: { createdAt: "desc" },
      take: 500,
    })

    // Fetch invoices linked to vehicle stage costs
    const costInvoiceIds = vehicleStageCosts
      .map((cost) => cost.invoiceId)
      .filter((id): id is string => id !== null)
    const costInvoices = costInvoiceIds.length > 0
      ? await prisma.invoice.findMany({
          where: { id: { in: costInvoiceIds } },
          select: {
            id: true,
            invoiceNumber: true,
          },
        })
      : []
    const invoiceMap = new Map(costInvoices.map((inv) => [inv.id, inv]))

    // Transform vehicle stage costs to transaction-like format
    const vehicleStageCostsAsTransactions = vehicleStageCosts.map((cost) => {
      const linkedInvoice = cost.invoiceId ? invoiceMap.get(cost.invoiceId) : null
      const dateValue = cost.paymentDate || cost.createdAt
      const dateStr = dateValue instanceof Date ? dateValue.toISOString() : (dateValue ? new Date(dateValue).toISOString() : new Date().toISOString())
      
      return {
        id: `vehicle-cost-${cost.id}`,
        direction: "OUTGOING" as TransactionDirection,
        type: "BANK_TRANSFER" as TransactionType, // Default type for vehicle costs
        amount: cost.amount,
        currency: cost.currency,
        date: dateStr, // Use payment date if available, otherwise creation date
        description: `${cost.costType}${cost.stage ? ` (${cost.stage})` : ""}`,
        vendorId: cost.vendorId,
        customerId: null,
        vehicleId: cost.vehicleId,
        invoiceId: cost.invoiceId || null, // Include invoiceId from vehicle stage cost
        invoiceNumber: linkedInvoice?.invoiceNumber || null,
        invoiceUrl: cost.invoiceUrl || null, // Vendor invoice/receipt attachment
        documentId: null,
        referenceNumber: null,
        notes: null,
        createdById: null,
        createdAt: cost.createdAt instanceof Date ? cost.createdAt.toISOString() : new Date(cost.createdAt).toISOString(),
        updatedAt: cost.updatedAt instanceof Date ? cost.updatedAt.toISOString() : new Date(cost.updatedAt).toISOString(),
        vendor: cost.vendor,
        customer: null,
        vehicle: cost.vehicle,
        isVehicleStageCost: true, // Flag to identify vehicle stage costs
        paymentDeadline: cost.paymentDeadline ? (cost.paymentDeadline instanceof Date ? cost.paymentDeadline.toISOString() : new Date(cost.paymentDeadline).toISOString()) : null,
        paymentDate: cost.paymentDate ? (cost.paymentDate instanceof Date ? cost.paymentDate.toISOString() : new Date(cost.paymentDate).toISOString()) : null,
      }
    })

    // Also fetch CostItems from invoice cost breakdown (expenses)
    let costItemsAsTransactions: any[] = []
    if (!direction || direction === "OUTGOING") {
      const costItemsInvoiceWhere: any = {
        vehicleId: vehicleId || { not: null },
        costInvoice: { isNot: null },
      }
      const invoicesWithCostItems = await prisma.invoice.findMany({
        where: costItemsInvoiceWhere,
        include: {
          vehicle: { select: { id: true, vin: true, make: true, model: true, year: true } },
          customer: { select: { id: true, name: true, email: true } },
          costInvoice: {
            include: {
              costItems: { include: { vendor: true } },
            },
          },
        },
      })
      for (const inv of invoicesWithCostItems) {
        if (!inv.costInvoice?.costItems?.length) continue
        for (const item of inv.costInvoice.costItems) {
          if (vendorId && item.vendorId !== vendorId) continue
          const dateValue = item.paymentDate || item.createdAt
          const itemDate = new Date(dateValue)
          if (startDate && itemDate < new Date(startDate)) continue
          if (endDate && itemDate > new Date(endDate)) continue
          const dateStr = dateValue instanceof Date ? dateValue.toISOString() : new Date(dateValue).toISOString()
          costItemsAsTransactions.push({
            id: `cost-item-${item.id}`,
            direction: "OUTGOING" as TransactionDirection,
            type: "BANK_TRANSFER" as TransactionType,
            amount: item.amount,
            currency: "JPY",
            date: dateStr,
            description: item.category || item.description,
            vendorId: item.vendorId,
            customerId: inv.customerId,
            vehicleId: inv.vehicleId,
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            invoiceUrl: null,
            documentId: null,
            referenceNumber: null,
            notes: null,
            createdById: null,
            createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : new Date(item.createdAt).toISOString(),
            updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : new Date(item.updatedAt).toISOString(),
            vendor: item.vendor,
            customer: inv.customer,
            vehicle: inv.vehicle,
            isCostItem: true,
            costItemId: item.id,
            paymentDeadline: item.paymentDeadline ? (item.paymentDeadline instanceof Date ? item.paymentDeadline.toISOString() : new Date(item.paymentDeadline).toISOString()) : null,
            paymentDate: item.paymentDate ? (item.paymentDate instanceof Date ? item.paymentDate.toISOString() : new Date(item.paymentDate).toISOString()) : null,
          })
        }
      }
    }

    // Fetch approved/finalized invoices for incoming payments
    let invoicesAsTransactions: any[] = []
    if (!direction || direction === "INCOMING") {
      const invoiceWhere: any = {
        status: {
          in: ["APPROVED", "FINALIZED"],
        },
      }

      // Apply date filters if provided
      if (startDate || endDate) {
        invoiceWhere.issueDate = {}
        if (startDate) {
          invoiceWhere.issueDate.gte = new Date(startDate)
        }
        if (endDate) {
          invoiceWhere.issueDate.lte = new Date(endDate)
        }
      }

      if (customerId) {
        invoiceWhere.customerId = customerId
      }

      if (vehicleId) {
        invoiceWhere.vehicleId = vehicleId
      }

      const invoices = await prisma.invoice.findMany({
        where: invoiceWhere,
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
              amount: true,
            },
          },
        },
        orderBy: { issueDate: "desc" },
        take: 500,
      })

      // Calculate payment status for each invoice (include tax in total)
      invoicesAsTransactions = invoices.map((invoice) => {
        const totalAmount = getInvoiceTotalWithTax(invoice)

        // Calculate payment status
        let paymentStatus = "due"
        const now = new Date()
        const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null

        if (invoice.paymentStatus === "PAID" || invoice.paidAt) {
          paymentStatus = "paid"
        } else if (invoice.paymentStatus === "PARTIALLY_PAID") {
          paymentStatus = "partially_paid"
        } else if (dueDate && dueDate < now) {
          paymentStatus = "overdue"
        } else {
          paymentStatus = "due"
        }

        return {
          id: `invoice-${invoice.id}`,
          direction: "INCOMING" as TransactionDirection,
          type: "BANK_TRANSFER" as TransactionType, // Default type
          amount: totalAmount,
          currency: "JPY",
          date: invoice.issueDate ? invoice.issueDate.toISOString() : new Date().toISOString(),
          description: `Invoice ${invoice.invoiceNumber}`,
          vendorId: null,
          customerId: invoice.customerId,
          vehicleId: invoice.vehicleId,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceUrl: null,
          documentId: null,
          referenceNumber: null,
          notes: null,
          createdById: invoice.createdById,
          createdAt: invoice.createdAt.toISOString(),
          updatedAt: invoice.updatedAt.toISOString(),
          vendor: null,
          customer: invoice.customer,
          vehicle: invoice.vehicle,
          isInvoice: true, // Flag to identify invoices
          paymentDeadline: invoice.dueDate ? invoice.dueDate.toISOString() : null,
          paymentDate: invoice.paidAt ? invoice.paidAt.toISOString() : null,
          paymentStatus: paymentStatus, // due, overdue, partially_paid, paid
          invoiceStatus: invoice.status,
        }
      })
    }

    // Normalize dates for regular transactions from database; include invoiceNumber from linked invoice
    const normalizedTransactions = transactions.map((t: any) => ({
      ...t,
      invoiceNumber: t.invoice?.invoiceNumber ?? t.invoiceNumber ?? null,
      date: t.date instanceof Date ? t.date.toISOString() : (typeof t.date === 'string' ? t.date : new Date(t.date).toISOString()),
      createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : (typeof t.createdAt === 'string' ? t.createdAt : new Date(t.createdAt).toISOString()),
      updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : (typeof t.updatedAt === 'string' ? t.updatedAt : new Date(t.updatedAt).toISOString()),
      paymentDeadline: t.paymentDeadline ? (t.paymentDeadline instanceof Date ? t.paymentDeadline.toISOString() : (typeof t.paymentDeadline === 'string' ? t.paymentDeadline : new Date(t.paymentDeadline).toISOString())) : null,
      paymentDate: t.paymentDate ? (t.paymentDate instanceof Date ? t.paymentDate.toISOString() : (typeof t.paymentDate === 'string' ? t.paymentDate : new Date(t.paymentDate).toISOString())) : null,
    }))

    // Combine and sort by date
    const allTransactions = [
      ...normalizedTransactions,
      ...generalCostsAsTransactions,
      ...vehicleStageCostsAsTransactions,
      ...costItemsAsTransactions,
      ...invoicesAsTransactions,
    ].sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      if (isNaN(dateA) || isNaN(dateB)) return 0
      return dateB - dateA
    })

    // Parse paymentDate from notes for regular transactions and normalize all dates
    const transactionsWithParsedPaymentDate = allTransactions.map((t: any) => {
      // Normalize date field
      if (t.date) {
        t.date = t.date instanceof Date ? t.date.toISOString() : (typeof t.date === 'string' ? t.date : new Date(t.date).toISOString());
      }
      
      // Normalize paymentDeadline
      if (t.paymentDeadline) {
        t.paymentDeadline = t.paymentDeadline instanceof Date ? t.paymentDeadline.toISOString() : (typeof t.paymentDeadline === 'string' ? t.paymentDeadline : new Date(t.paymentDeadline).toISOString());
      }
      
      // If transaction doesn't have paymentDate but has notes, try to parse it
      if (!t.paymentDate && t.notes) {
        try {
          const notesData = JSON.parse(t.notes);
          if (notesData.paymentDate) {
            t.paymentDate = notesData.paymentDate;
          }
        } catch (e) {
          // Notes is not JSON, ignore
        }
      }
      
      // Normalize paymentDate
      if (t.paymentDate) {
        t.paymentDate = t.paymentDate instanceof Date ? t.paymentDate.toISOString() : (typeof t.paymentDate === 'string' ? t.paymentDate : new Date(t.paymentDate).toISOString());
      }
      
      return t;
    });

    const convertedTransactions = convertDecimalsToNumbers(transactionsWithParsedPaymentDate)
    console.log(`[Transactions API] Returning ${convertedTransactions.length} transactions (${transactions.length} regular, ${generalCosts.length} general costs, ${vehicleStageCosts.length} vehicle costs, ${costItemsAsTransactions.length} invoice cost items)`)
    return NextResponse.json(convertedTransactions)
  } catch (error: any) {
    console.error("[Transactions API] Error fetching transactions:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch transactions",
        details: error.message || String(error),
        code: error.code || "UNKNOWN",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManageTransactions(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const {
      direction,
      type,
      amount,
      currency,
      date,
      paymentDeadline,
      description,
      vendorId,
      customerId,
      vehicleId,
      invoiceId,
      containerInvoiceId,
      vehicleStageCostId,
      costItemId,
      generalCostId,
      invoiceUrl,
      referenceNumber,
      notes,
    } = body

    if (!direction || !type || !amount) {
      return NextResponse.json(
        { error: "Direction, type, and amount are required" },
        { status: 400 }
      )
    }

    // Use date or paymentDeadline as fallback (date can be optional)
    const transactionDate = date
      ? new Date(date)
      : paymentDeadline
        ? new Date(paymentDeadline)
        : new Date()

    // Create transaction and sync with invoice/vehicle
    const transaction = await prisma.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          direction,
          type,
          amount: parseFloat(amount),
          currency: currency || "JPY",
          date: transactionDate,
          description: description || null,
          vendorId: vendorId || null,
          customerId: customerId || null,
          vehicleId: vehicleId || null,
          invoiceId: invoiceId || null,
          containerInvoiceId: containerInvoiceId || null,
          vehicleStageCostId: vehicleStageCostId || null,
          costItemId: costItemId || null,
          generalCostId: generalCostId || null,
          invoiceUrl: invoiceUrl || null,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          createdById: session.user.id,
        },
        include: {
          vendor: true,
          customer: true,
          vehicle: true,
        },
      })

      // Sync invoice payment status if transaction is linked to an invoice
      if (invoiceId && direction === "INCOMING") {
        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
          include: { charges: true },
        })

        if (invoice) {
          const totalAmount = getInvoiceTotalWithTax(invoice)

          // Get all incoming transactions for this invoice
          const invoiceTransactions = await tx.transaction.findMany({
            where: {
              invoiceId: invoiceId,
              direction: "INCOMING",
            },
          })

          const totalReceived = invoiceTransactions.reduce(
            (sum, t) => sum + parseFloat(t.amount.toString()),
            0,
          )

          let paymentStatus = "PENDING"
          if (isAmountPaidInFull(totalReceived, totalAmount)) {
            paymentStatus = "PAID"
          } else if (hasPartialPayment(totalReceived)) {
            paymentStatus = "PARTIALLY_PAID"
          }

          await tx.invoice.update({
            where: { id: invoiceId },
            data: {
              paymentStatus: paymentStatus as any,
              paidAt: paymentStatus === "PAID" ? new Date() : null,
            },
          })
        }
      }

      // Sync expense paymentDate when OUTGOING transaction is linked to an expense
      if (direction === "OUTGOING") {
        if (vehicleStageCostId) {
          await tx.vehicleStageCost.update({
            where: { id: vehicleStageCostId },
            data: { paymentDate: transactionDate },
          })
        }
        if (costItemId) {
          await tx.costItem.update({
            where: { id: costItemId },
            data: { paymentDate: transactionDate },
          })
        }
        if (generalCostId) {
          // GeneralCost doesn't have paymentDate - it has date. Skip or add field? Schema has date, not paymentDate. Leave as-is for now.
        }
      }

      // Sync vehicle payment tracking if transaction is linked to a vehicle
      if (vehicleId && direction === "INCOMING") {
        // Get all transactions for this vehicle
        const vehicleTransactions = await tx.transaction.findMany({
          where: {
            vehicleId: vehicleId,
            direction: "INCOMING",
          },
        })

        const totalReceived = vehicleTransactions.reduce(
          (sum, t) => sum + parseFloat(t.amount.toString()),
          0,
        )

        // Update vehicle shipping stage totalReceived
        await tx.vehicleShippingStage.upsert({
          where: { vehicleId: vehicleId },
          update: {
            totalReceived: totalReceived,
          },
          create: {
            vehicleId: vehicleId,
            stage: "PURCHASE",
            totalReceived: totalReceived,
          },
        })
      }

      return newTransaction
    })

    return NextResponse.json(convertDecimalsToNumbers(transaction), { status: 201 })
  } catch (error) {
    console.error("Error creating transaction:", error)
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    )
  }
}
