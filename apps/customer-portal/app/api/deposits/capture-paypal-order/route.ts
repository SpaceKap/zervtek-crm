import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const PAYPAL_FEE_RATE = 0.043;

function getPayPalBaseUrl(): string {
  const mode = process.env.PAYPAL_MODE || "sandbox";
  return mode === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("PayPal credentials not configured");
  const base = getPayPalBaseUrl();
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("PayPal token failed");
  const data = await res.json();
  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const orderId = body.orderId as string;
    const amountReceived = body.amountReceived as number;
    if (!orderId || typeof amountReceived !== "number" || amountReceived <= 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const token = await getAccessToken();
    const base = getPayPalBaseUrl();
    const captureRes = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    if (!captureRes.ok) {
      const err = await captureRes.text();
      console.error("PayPal capture error:", captureRes.status, err);
      return NextResponse.json(
        { error: "Payment capture failed" },
        { status: 402 }
      );
    }

    await prisma.transaction.create({
      data: {
        direction: "INCOMING",
        type: "PAYPAL",
        amount: amountReceived,
        currency: "JPY",
        date: new Date(),
        description: "Deposit",
        customerId: session.user.id,
        depositReceivedAt: new Date(),
        notes: "PayPal (captured)",
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("capture-paypal-order error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
