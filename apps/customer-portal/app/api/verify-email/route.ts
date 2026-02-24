import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", request.url));
  }

  const customer = await prisma.customer.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationExpiresAt: { gt: new Date() },
    },
  });

  if (!customer) {
    return NextResponse.redirect(new URL("/login?error=invalid_or_expired", request.url));
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    },
  });

  return NextResponse.redirect(new URL("/login?verified=1", request.url));
}
