import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canViewTransactions, canManageTransactions } from "@/lib/permissions"
import { TransactionDirection, TransactionType } from "@prisma/client"
import { convertDecimalsToNumbers } from "@/lib/decimal"

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
      date: cost.date,
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
      createdAt: cost.createdAt,
      updatedAt: cost.updatedAt,
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    })

    // Transform vehicle stage costs to transaction-like format
    const vehicleStageCostsAsTransactions = vehicleStageCosts.map((cost) => ({
      id: `vehicle-cost-${cost.id}`,
      direction: "OUTGOING" as TransactionDirection,
      type: "BANK_TRANSFER" as TransactionType, // Default type for vehicle costs
      amount: cost.amount,
      currency: cost.currency,
      date: cost.paymentDate || cost.createdAt, // Use payment date if available, otherwise creation date
      description: `${cost.costType}${cost.stage ? ` (${cost.stage})` : ""}`,
      vendorId: cost.vendorId,
      customerId: null,
      vehicleId: cost.vehicleId,
      invoiceId: null,
      invoiceUrl: null,
      documentId: null,
      referenceNumber: null,
      notes: null,
      createdById: null,
      createdAt: cost.createdAt,
      updatedAt: cost.updatedAt,
      vendor: cost.vendor,
      customer: null,
      vehicle: cost.vehicle,
      isVehicleStageCost: true, // Flag to identify vehicle stage costs
      paymentDeadline: cost.paymentDeadline,
      paymentDate: cost.paymentDate,
    }))

    // Combine and sort by date
    const allTransactions = [...transactions, ...generalCostsAsTransactions, ...vehicleStageCostsAsTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    return NextResponse.json(convertDecimalsToNumbers(allTransactions))
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
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
      description,
      vendorId,
      customerId,
      vehicleId,
      invoiceId,
      invoiceUrl,
      referenceNumber,
      notes,
    } = body

    if (!direction || !type || !amount || !date) {
      return NextResponse.json(
        { error: "Direction, type, amount, and date are required" },
        { status: 400 }
      )
    }

    const transaction = await prisma.transaction.create({
      data: {
        direction,
        type,
        amount: parseFloat(amount),
        currency: currency || "JPY",
        date: new Date(date),
        description: description || null,
        vendorId: vendorId || null,
        customerId: customerId || null,
        vehicleId: vehicleId || null,
        invoiceId: invoiceId || null,
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

    return NextResponse.json(convertDecimalsToNumbers(transaction), { status: 201 })
  } catch (error) {
    console.error("Error creating transaction:", error)
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    )
  }
}
