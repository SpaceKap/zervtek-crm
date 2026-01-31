import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth, canCreateInvoice, canViewAllInquiries } from "@/lib/permissions"
import { InvoiceStatus } from "@prisma/client"

// Generate invoice number: AUC-YYYY-XXX
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `AUC-${year}-`

  // Use a transaction to ensure atomicity and prevent race conditions
  return await prisma.$transaction(async (tx) => {
    // Find the highest invoice number for this year
    const lastInvoice = await tx.invoice.findFirst({
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
  })
}

// Generate multiple sequential invoice numbers for container invoices
async function generateInvoiceNumbers(count: number): Promise<string[]> {
  const year = new Date().getFullYear()
  const prefix = `AUC-${year}-`

  // Use a transaction to ensure atomicity and prevent race conditions
  return await prisma.$transaction(async (tx) => {
    // Find the highest invoice number for this year
    const lastInvoice = await tx.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        invoiceNumber: "desc",
      },
    })

    let startNumber = 1
    if (lastInvoice) {
      const lastNumber = parseInt(
        lastInvoice.invoiceNumber.replace(prefix, ""),
        10
      )
      startNumber = lastNumber + 1
    }

    // Generate sequential numbers
    const numbers: string[] = []
    for (let i = 0; i < count; i++) {
      const number = startNumber + i
      numbers.push(`${prefix}${number.toString().padStart(3, "0")}`)
    }

    return numbers
  })
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const customerId = searchParams.get("customer")

    const canViewAll = canViewAllInquiries(user.role)

    const where: any = {}
    if (status) {
      where.status = status as InvoiceStatus
    }
    if (customerId) {
      where.customerId = customerId
    }
    if (!canViewAll) {
      // Staff (SALES) can only see invoices they created
      where.createdById = user.id
    } else if (user.role === "MANAGER") {
      // Managers see their invoices + staff invoices
      // Optimized: Fetch staff IDs efficiently (with index on role)
      const staffUsers = await prisma.user.findMany({
        where: { role: "SALES" },
        select: { id: true },
      })
      const staffIds = staffUsers.map((u) => u.id)
      where.createdById = {
        in: [user.id, ...staffIds],
      }
    }
    // ADMIN can see all (no filter)

    // Add pagination
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    const invoices = await prisma.invoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        createdAt: true,
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
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        charges: {
          select: {
            id: true,
            description: true,
            amount: true,
          },
          take: 10, // Limit charges per invoice for list view
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    })

    // Get total count for pagination
    const total = await prisma.invoice.count({ where })

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
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
    
    // Log received data for debugging
    console.log("Received invoice data:", JSON.stringify(body, null, 2))
    
    const {
      customerId,
      vehicleId,
      status,
      issueDate,
      dueDate,
      taxEnabled,
      taxRate,
      notes,
      charges,
      customerUsesInJapan,
      metadata,
    } = body

    // Validate required fields with detailed error messages
    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      )
    }
    if (!vehicleId) {
      return NextResponse.json(
        { error: "Vehicle ID is required" },
        { status: 400 }
      )
    }
    
    // Validate that IDs are strings
    if (typeof customerId !== 'string') {
      return NextResponse.json(
        { error: `Invalid customer ID type: ${typeof customerId}. Expected string.` },
        { status: 400 }
      )
    }
    if (typeof vehicleId !== 'string') {
      return NextResponse.json(
        { error: `Invalid vehicle ID type: ${typeof vehicleId}. Expected string.` },
        { status: 400 }
      )
    }

    const invoiceNumber = await generateInvoiceNumber()

    // Validate charges
    if (!charges || !Array.isArray(charges) || charges.length === 0) {
      return NextResponse.json(
        { error: "At least one charge is required" },
        { status: 400 }
      )
    }

    // Validate charge amounts
    for (const charge of charges) {
      if (!charge.description || charge.description.trim() === "") {
        return NextResponse.json(
          { error: "All charges must have a description" },
          { status: 400 }
        )
      }
      const amount = typeof charge.amount === "number" ? charge.amount : parseFloat(charge.amount);
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { error: `Invalid amount for charge: ${charge.description}` },
          { status: 400 }
        )
      }
    }

    // Validate status and auto-set to PENDING_APPROVAL for staff/managers (unless admin)
    const validStatuses = Object.values(InvoiceStatus);
    let invoiceStatus: InvoiceStatus;
    if (user.role === "ADMIN") {
      // Admin can set any status
      invoiceStatus = validStatuses.includes(status as InvoiceStatus) 
        ? (status as InvoiceStatus) 
        : InvoiceStatus.DRAFT;
    } else {
      // Staff and managers: automatically set to PENDING_APPROVAL
      invoiceStatus = InvoiceStatus.PENDING_APPROVAL;
    }

    // Default Wise payment link (can be overridden by admin later)
    const defaultWiseLink = process.env.DEFAULT_WISE_PAYMENT_LINK || "https://wise.com/pay/business/ugoigd";

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId,
        vehicleId,
        createdById: user.id,
        status: invoiceStatus,
        issueDate: issueDate ? (typeof issueDate === 'string' ? new Date(issueDate) : issueDate) : new Date(),
        dueDate: dueDate ? (typeof dueDate === 'string' ? new Date(dueDate) : dueDate) : null,
        taxEnabled: taxEnabled || false,
        taxRate: taxRate ? parseFloat(taxRate.toString()) : 10,
        notes: notes || null,
        isCIF: false, // CIF is now handled via description text
        customerUsesInJapan: customerUsesInJapan !== undefined ? customerUsesInJapan : (taxEnabled || false),
        metadata: metadata || null,
        wisePaymentLink: defaultWiseLink,
        charges: {
          create: charges.map((charge: any) => ({
            chargeTypeId: null, // No longer using chargeTypeId, chargeType is stored in description prefix
            description: charge.description,
            amount: typeof charge.amount === "number" ? charge.amount : parseFloat(charge.amount),
          })),
        },
      },
      include: {
        customer: true,
        vehicle: true,
        charges: true,
      },
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error: any) {
    console.error("Error creating invoice:", error)
    // Provide more detailed error messages
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "Invalid customer or vehicle ID. Please ensure both customer and vehicle exist." },
        { status: 400 }
      )
    }
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Invoice number already exists. Please try again." },
        { status: 400 }
      )
    }
    if (error.code === "P2012") {
      return NextResponse.json(
        { error: "Missing required field. Please check all required fields are provided." },
        { status: 400 }
      )
    }
    // Log the full error for debugging
    console.error("Full error details:", JSON.stringify(error, null, 2))
    return NextResponse.json(
      { 
        error: error.message || "Failed to create invoice",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
