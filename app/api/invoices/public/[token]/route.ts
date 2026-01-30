import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Simple in-memory rate limiting (consider using Redis for production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(ip)
  
  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 }) // 1 minute window
    return true
  }
  
  if (limit.count >= 20) { // 20 requests per minute
    return false
  }
  
  limit.count++
  return true
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    // Basic rate limiting
    const ip = request.headers.get("x-forwarded-for") || 
               request.headers.get("x-real-ip") || 
               "unknown"
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    const invoice = await prisma.invoice.findUnique({
      where: { shareToken: params.token },
      include: {
        customer: true,
        vehicle: true,
        charges: {
          include: {
            chargeType: true,
          },
        },
        costInvoice: {
          include: {
            costItems: {
              include: {
                vendor: true,
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

    // Only return approved or finalized invoices
    if (invoice.status !== "APPROVED" && invoice.status !== "FINALIZED") {
      return NextResponse.json(
        { error: "Invoice not available" },
        { status: 403 }
      )
    }

    // Calculate total amount
    const totalCharges = invoice.charges.reduce(
      (sum, charge) => sum + parseFloat(charge.amount.toString()),
      0
    )

    let totalAmount = totalCharges
    if (invoice.taxEnabled && invoice.taxRate) {
      const taxRate = parseFloat(invoice.taxRate.toString())
      const taxAmount = totalCharges * (taxRate / 100)
      totalAmount += taxAmount
    }

    return NextResponse.json({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        status: invoice.status,
        paymentStatus: invoice.paymentStatus,
        taxEnabled: invoice.taxEnabled,
        taxRate: invoice.taxRate,
        notes: invoice.notes,
        wisePaymentLink: invoice.wisePaymentLink,
        paidAt: invoice.paidAt,
        customer: invoice.customer,
        vehicle: invoice.vehicle,
        charges: invoice.charges,
        totalAmount,
      },
    })
  } catch (error) {
    console.error("Error fetching public invoice:", error)
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    )
  }
}
