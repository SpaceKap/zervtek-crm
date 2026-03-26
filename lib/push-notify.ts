import "server-only";

import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let vapidConfigured = false;

function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT?.trim() || "mailto:support@zervtek.com";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  vapidConfigured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export type AssignmentPushPayload = {
  inquiryId: string;
  title: string;
  body: string;
  /** Path only, e.g. /dashboard/inquiries/abc */
  url: string;
};

/**
 * Sends a Web Push to all registered devices for the user. Stale endpoints are removed.
 */
export async function sendAssignmentPushNotification(
  userId: string,
  payload: AssignmentPushPayload
): Promise<void> {
  if (!ensureVapid()) return;

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    inquiryId: payload.inquiryId,
  });

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        data,
        {
          TTL: 86_400,
          // Helps timely delivery on Android (FCM); safe for Apple endpoints too.
          urgency: "high",
        },
      );
    } catch (err: unknown) {
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 410 || status === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
      } else {
        console.error("[push-notify] send failed", err);
      }
    }
  }
}
