import { NextResponse } from "next/server";

/**
 * Returns payment options for the deposit form (Wise link, PayPal client id).
 * Wise link is used for redirect; PayPal client id is used by the client SDK.
 */
export async function GET() {
  const wisePaymentLink =
    process.env.NEXT_PUBLIC_WISE_DEPOSIT_LINK ||
    process.env.DEFAULT_WISE_PAYMENT_LINK ||
    null;
  const paypalClientId =
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || null;

  return NextResponse.json({
    wisePaymentLink,
    paypalClientId,
  });
}
