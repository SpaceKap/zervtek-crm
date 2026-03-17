import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const CORS_ORIGIN = process.env.NEXT_PUBLIC_CLIENT_PAY_BASE_URL || "https://clients.zervtek.com"

function jsonWithCors(data: object, status: number, init?: ResponseInit) {
  return NextResponse.json(data, {
    status,
    ...init,
    headers: {
      ...init?.headers,
      "Access-Control-Allow-Origin": CORS_ORIGIN,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": CORS_ORIGIN,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  })
}

/**
 * GET: Public lookup for a deposit payment link by token (no auth).
 * Used by clients.zervtek.com/pay/[token] to show amount and redirect to PayPal.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  const { token } = await props.params
  if (!token) {
    return jsonWithCors({ error: "Token required" }, 400)
  }

  const link = await prisma.depositPaymentLink.findUnique({
    where: { token },
    include: { customer: { select: { name: true } } },
  })

  if (!link) {
    return jsonWithCors({ error: "Link not found" }, 404)
  }

  const now = new Date()
  const expired = link.expiresAt < now
  if (expired && link.status === "PENDING") {
    await prisma.depositPaymentLink.update({
      where: { id: link.id },
      data: { status: "EXPIRED" },
    })
    link.status = "EXPIRED"
  }

  if (link.status === "PAID") {
    return jsonWithCors({
      status: "PAID",
      message: "This payment link has already been paid.",
    }, 200)
  }

  if (expired || link.status === "EXPIRED") {
    return jsonWithCors({
      status: "EXPIRED",
      message: "This payment link has expired.",
    }, 200)
  }

  return jsonWithCors({
    status: "PENDING",
    amount: parseFloat(link.amount.toString()),
    currency: link.currency,
    customerName: link.customer.name,
    memo: link.memo,
    paypalPaymentUrl: link.paypalPaymentUrl,
    expiresAt: link.expiresAt.toISOString(),
  }, 200)
}
