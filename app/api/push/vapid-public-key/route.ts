import { NextResponse } from "next/server";

/**
 * Public VAPID key for PushManager.subscribe (safe to expose).
 * Prefer VAPID_PUBLIC_KEY so it always matches VAPID_PRIVATE_KEY in lib/push-notify.ts.
 * (If NEXT_PUBLIC_* alone differed, sends would fail with 401/403 on FCM/APNs.)
 */
export async function GET() {
  const key =
    process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Push notifications are not configured on this server" },
      { status: 503 }
    );
  }
  return NextResponse.json({ publicKey: key });
}
