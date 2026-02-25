import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const PAYPAL_MAX_JPY = 250_000;
const PAYPAL_FEE_RATE = 0.043; // 4.3% - we add this so received amount = amount

function getPayPalBaseUrl(): string {
  const mode = process.env.PAYPAL_MODE || "sandbox";
  return mode === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new Error("PayPal credentials not configured");
  }
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal token failed: ${res.status} ${text}`);
  }
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
    const amount = typeof body.amount === "number" ? body.amount : parseFloat(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (amount > PAYPAL_MAX_JPY) {
      return NextResponse.json(
        { error: `PayPal deposits are limited to ${PAYPAL_MAX_JPY.toLocaleString()} JPY` },
        { status: 400 }
      );
    }

    const totalCharge = amount / (1 - PAYPAL_FEE_RATE);
    const totalRounded = Math.round(totalCharge * 100) / 100;
    const valueStr = totalRounded.toFixed(2);

    const token = await getAccessToken();
    const base = getPayPalBaseUrl();
    const createRes = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "JPY",
              value: valueStr,
            },
            description: "Deposit",
          },
        ],
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error("PayPal create order error:", createRes.status, err);
      return NextResponse.json(
        { error: "Failed to create PayPal order" },
        { status: 502 }
      );
    }

    const order = await createRes.json();
    const orderId = order.id;
    if (!orderId) {
      return NextResponse.json(
        { error: "Invalid PayPal response" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      orderId,
      totalCharge: totalRounded,
      amountReceived: amount,
    });
  } catch (e) {
    console.error("create-paypal-order error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
