import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

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
      return NextResponse.json({
        message: "If an account exists with this email, you will receive a password reset link.",
      });
    }
    if (!customer.passwordHash) {
      return NextResponse.json({
        message: "If an account exists with this email, you will receive a password reset link.",
      });
    }

    const passwordResetToken = randomBytes(32).toString("hex");
    const passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.customer.update({
      where: { id: customer.id },
      data: { passwordResetToken, passwordResetExpiresAt },
    });

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.PORTAL_URL ||
      (request.headers.get("origin") ?? "http://localhost:3001");
    const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${passwordResetToken}`;
    const sent = await sendPasswordResetEmail(email, customer.name ?? "Customer", resetUrl);

    return NextResponse.json({
      message: sent
        ? "If an account exists with this email, you will receive a password reset link."
        : "Password reset email could not be sent. Please try again later.",
      ok: sent,
    });
  } catch (e) {
    console.error("Forgot password error:", e);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
