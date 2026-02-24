import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : null;
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const customer = await prisma.customer.findFirst({
      where: { email },
    });
    if (!customer) {
      return NextResponse.json({ error: "No account found with this email" }, { status: 404 });
    }
    if (customer.emailVerifiedAt) {
      return NextResponse.json({ error: "Email is already verified. You can sign in." }, { status: 400 });
    }

    const emailVerificationToken = randomBytes(32).toString("hex");
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.customer.update({
      where: { id: customer.id },
      data: { emailVerificationToken, emailVerificationExpiresAt },
    });

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.PORTAL_URL ||
      (request.headers.get("origin") ?? "http://localhost:3001");
    const verifyUrl = `${baseUrl.replace(/\/$/, "")}/api/verify-email?token=${emailVerificationToken}`;
    const sent = await sendVerificationEmail(email, customer.name ?? "Customer", verifyUrl);

    return NextResponse.json({
      message: sent
        ? "Verification email sent. Please check your inbox."
        : "Verification email could not be sent. Please try again later.",
    });
  } catch (e) {
    console.error("Resend verification error:", e);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
