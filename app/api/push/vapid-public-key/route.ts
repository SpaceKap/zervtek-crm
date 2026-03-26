import { NextResponse } from "next/server";

/**
 * Public VAPID key for PushManager.subscribe (safe to expose).
 */
export async function GET() {
  const key =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Push notifications are not configured on this server" },
      { status: 503 }
    );
  }
  return NextResponse.json({ publicKey: key });
}
