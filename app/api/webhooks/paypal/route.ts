import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const PAYPAL_API_BASE =
  process.env.PAYPAL_SANDBOX === "true"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com"
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID

/**
 * POST: PayPal webhook. Verify signature and on INVOICING.INVOICE.PAID create deposit transaction.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  if (!rawBody) {
    return NextResponse.json({ error: "No body" }, { status: 400 })
  }

  const authAlgo = request.headers.get("paypal-auth-algo")
  const certUrl = request.headers.get("paypal-cert-url")
  const transmissionId = request.headers.get("paypal-transmission-id")
  const transmissionSig = request.headers.get("paypal-transmission-sig")
  const transmissionTime = request.headers.get("paypal-transmission-time")

  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return NextResponse.json({ error: "Missing PayPal headers" }, { status: 400 })
  }

  if (PAYPAL_WEBHOOK_ID) {
    const clientId = process.env.PAYPAL_CLIENT_ID
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET
    if (clientId && clientSecret) {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
      const verifyRes = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: PAYPAL_WEBHOOK_ID,
          webhook_event: JSON.parse(rawBody),
        }),
      })
      if (!verifyRes.ok || (await verifyRes.json()).verification_status !== "SUCCESS") {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }
  }

  let event: { event_type?: string; resource?: { id?: string; status?: string } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (event.event_type !== "INVOICING.INVOICE.PAID") {
    return NextResponse.json({ received: true })
  }

  const invoiceId = event.resource?.id
  if (!invoiceId) {
    return NextResponse.json({ error: "No invoice id in event" }, { status: 400 })
  }

  const link = await prisma.depositPaymentLink.findFirst({
    where: { paypalInvoiceId: invoiceId, status: "PENDING" },
    include: { customer: true },
  })

  if (!link) {
    return NextResponse.json({ received: true })
  }

  const amount = parseFloat(link.amount.toString())

  const transaction = await prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findMany({
      where: { direction: "DEPOSIT", depositNumber: { not: null } },
      select: { depositNumber: true },
    })
    const numbers = existing
      .map((t) => t.depositNumber && t.depositNumber.match(/^DEP-(\d+)$/))
      .filter((m): m is RegExpMatchArray => !!m && !!m[1])
      .map((m) => parseInt(m[1], 10))
    const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 8001
    const depositNumber = `DEP-${next}`

    const newTx = await tx.transaction.create({
      data: {
        direction: "DEPOSIT",
        type: "PAYPAL",
        amount,
        currency: link.currency,
        date: new Date(),
        description: link.memo || "PayPal deposit",
        customerId: link.customerId,
        depositNumber,
      },
    })

    await tx.depositPaymentLink.update({
      where: { id: link.id },
      data: { status: "PAID", transactionId: newTx.id },
    })

    return newTx
  })

  return NextResponse.json({ received: true, transactionId: transaction.id })
}
