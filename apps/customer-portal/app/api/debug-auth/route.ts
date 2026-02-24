import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { compare } from "bcryptjs";

/**
 * Dev-only: check what the DB returns for a given email (for login debugging).
 * GET ?email=... - returns found, hasPassword, hasVerified
 * POST { email, password } - returns same + passwordMatch (whether login would succeed)
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "?email= required" }, { status: 400 });
  }
  const result = await queryCustomer(email, null);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  const result = await queryCustomer(email, password ?? null);
  return NextResponse.json(result);
}

async function queryCustomer(
  email: string,
  password: string | null
): Promise<Record<string, unknown>> {
  try {
    const rows = await prisma.$queryRawUnsafe<
      { id: string; passwordHash: string | null; hasVerified: boolean }[]
    >(
      `SELECT id, "passwordHash",
              "emailVerifiedAt" IS NOT NULL AS "hasVerified"
       FROM inquiry_pooler."Customer"
       WHERE LOWER(TRIM(email)) = $1
       LIMIT 1`,
      email
    );
    const row = rows[0];
    if (!row) {
      return { found: false, message: "No customer with this email" };
    }
    const hasPassword = !!(row.passwordHash && row.passwordHash.length > 0);
    const out: Record<string, unknown> = {
      found: true,
      hasPassword,
      hasVerified: row.hasVerified,
    };
    if (password !== null && row.passwordHash) {
      const match = await compare(password, row.passwordHash);
      out.passwordMatch = match;
      out.wouldLogin = match && row.hasVerified;
    }
    return out;
  } catch (err) {
    console.error("[debug-auth]", err);
    throw err;
  }
}
