import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInvoiceTotalWithTax } from "@/lib/invoice-utils"
import { getCached, checkRateLimit } from "@/lib/cache"

const INVOICE_CACHE_TTL = 300 // 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"

    const allowed = await checkRateLimit(ip, 60, 20)
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    const cacheKey = `invoice:token:${params.token}`

    const body = await getCached(
      cacheKey,
      async () => {
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
          return { __notFound: true as const }
        }
        if (invoice.status !== "APPROVED" && invoice.status !== "FINALIZED") {
          return { __forbidden: true as const }
        }

        const totalAmount = getInvoiceTotalWithTax(invoice)
        return {
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
        }
      },
      INVOICE_CACHE_TTL,
      (v) => !("__notFound" in v) && !("__forbidden" in v)
    )

    if (body && "__notFound" in body && body.__notFound) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }
    if (body && "__forbidden" in body && body.__forbidden) {
      return NextResponse.json(
        { error: "Invoice not available" },
        { status: 403 }
      )
    }

    return NextResponse.json(body)
  } catch (error) {
    console.error("Error fetching public invoice:", error)
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    )
  }
}
