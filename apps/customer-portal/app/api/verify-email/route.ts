import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function getRedirectBase(request: NextRequest): string {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.PORTAL_URL ||
    new URL(request.url).origin
  ).replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const base = getRedirectBase(request);
  if (!token) {
    return NextResponse.redirect(`${base}/login?error=missing_token`);
  }

  const customer = await prisma.customer.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationExpiresAt: { gt: new Date() },
    },
  });

  if (!customer) {
    return NextResponse.redirect(`${base}/login?error=invalid_or_expired`);
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    },
  });

  return NextResponse.redirect(`${base}/login?verified=1`);
}
