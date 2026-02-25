import { NextRequest, NextResponse } from "next/server";
import { sendEmail, sendVerificationEmail } from "@/lib/email";

/** Dev-only: send a test email. POST body: { "to": "email@example.com", "format": "verification" } */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  let body: { to?: string; format?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "Valid 'to' email required" }, { status: 400 });
  }

  const useVerificationFormat = body.format === "verification";
  const baseUrl =
    process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://clients.zervtek.com";
  const fakeVerifyUrl = `${baseUrl.replace(/\/$/, "")}/api/verify-email?token=test-placeholder-do-not-use`;

  const sent = useVerificationFormat
    ? await sendVerificationEmail(to, "Test User", fakeVerifyUrl)
    : await sendEmail({
        to,
        subject: "ZervTek test email",
        text: "This is a test email from your ZervTek customer portal. If you received this, email is configured correctly.\n\n— The ZervTek Team",
      });

  if (!sent) {
    return NextResponse.json(
      { error: "Failed to send (check SMTP settings in .env)" },
      { status: 500 }
    );
  }
  return NextResponse.json({
    ok: true,
    to,
    format: useVerificationFormat ? "verification" : "plain",
  });
}
