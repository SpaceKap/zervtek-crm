import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createPayPalDraftInvoice, getPayPalPayerViewUrl } from "@/lib/paypal"
import { randomBytes } from "crypto"

const CLIENT_PAY_BASE = process.env.NEXT_PUBLIC_CLIENT_PAY_BASE_URL || "https://clients.zervtek.com"
const LINK_EXPIRES_DAYS = 3

function generateToken(): string {
  return randomBytes(24).toString("base64url")
}

/**
 * POST: Create a deposit payment link for a customer.
 * Body: { customerId: string, amount: number, currency?: string, memo?: string }
 * Optionally create customer: { createCustomer?: { name, email?, phone? } } instead of customerId.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { customerId, amount, currency = "JPY", memo, createCustomer } = body

    let resolvedCustomerId: string

    if (createCustomer && typeof createCustomer === "object") {
      const { name, email, phone } = createCustomer
      if (!name || typeof name !== "string" || !name.trim()) {
        return NextResponse.json(
          { error: "createCustomer.name is required" },
          { status: 400 }
        )
      }
      const created = await prisma.customer.create({
        data: {
          name: name.trim(),
          email: typeof email === "string" ? email.trim() || null : null,
          phone: typeof phone === "string" ? phone.trim() || null : null,
        },
      })
      resolvedCustomerId = created.id
    } else if (customerId && typeof customerId === "string") {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      })
      if (!customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 })
      }
      resolvedCustomerId = customer.id
    } else {
      return NextResponse.json(
        { error: "Either customerId or createCustomer is required" },
        { status: 400 }
      )
    }

    const amountNum = typeof amount === "number" ? amount : parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 }
      )
    }

    const customer = await prisma.customer.findUnique({
      where: { id: resolvedCustomerId },
      select: { id: true, name: true, email: true },
    })
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + LINK_EXPIRES_DAYS)

    let paypalInvoiceId: string | null = null
    let paypalPaymentUrl: string | null = null

    try {
      const { id: invoiceId } = await createPayPalDraftInvoice({
        amount: amountNum,
        currency: currency || "JPY",
        recipientEmail: customer.email || null,
        recipientName: customer.name,
        memo: memo || null,
      })
      paypalInvoiceId = invoiceId
      paypalPaymentUrl = getPayPalPayerViewUrl(invoiceId)
    } catch (err: any) {
      console.error("PayPal create invoice error:", err)
      return NextResponse.json(
        { error: err?.message || "Failed to create PayPal invoice" },
        { status: 502 }
      )
    }

    let token = generateToken()
    let exists = await prisma.depositPaymentLink.findUnique({ where: { token } })
    while (exists) {
      token = generateToken()
      exists = await prisma.depositPaymentLink.findUnique({ where: { token } })
    }

    const link = await prisma.depositPaymentLink.create({
      data: {
        customerId: resolvedCustomerId,
        amount: amountNum,
        currency: currency || "JPY",
        token,
        memo: typeof memo === "string" ? memo.trim() || null : null,
        paypalInvoiceId,
        paypalPaymentUrl,
        status: "PENDING",
        expiresAt,
        createdById: session.user.id,
      },
    })

    const clientPayUrl = `${CLIENT_PAY_BASE}/pay/${link.token}`

    return NextResponse.json({
      id: link.id,
      token: link.token,
      link: clientPayUrl,
      paypalPaymentUrl,
      expiresAt: link.expiresAt.toISOString(),
      amount: amountNum,
      currency: link.currency,
      customerName: customer.name,
    })
  } catch (error: any) {
    console.error("Create deposit link error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to create deposit link" },
      { status: 500 }
    )
  }
}
