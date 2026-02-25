import { NextRequest, NextResponse } from "next/server";
import { invalidateCache, invalidateCachePattern } from "@/lib/cache";

/**
 * POST /api/internal/invalidate-customer-cache
 * Body: { customerId: string }
 * Header: x-internal-secret (must match INTERNAL_API_SECRET)
 * Called by the customer portal when a customer updates their profile so the CRM
 * shows updated data (e.g. port of destination) without waiting for cache TTL.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-internal-secret");
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: { customerId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const customerId = body.customerId;
  if (!customerId || typeof customerId !== "string") {
    return NextResponse.json(
      { error: "customerId is required" },
      { status: 400 }
    );
  }
  await invalidateCache(`customer:id:${customerId}`);
  await invalidateCachePattern("vehicle:id:");
  return NextResponse.json({ ok: true });
}
