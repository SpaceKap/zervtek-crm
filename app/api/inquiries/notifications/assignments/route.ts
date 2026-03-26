import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const DEFAULT_TAKE = 40;
const MAX_TAKE = 100;

function countryFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const c = (metadata as Record<string, unknown>).country;
  return typeof c === "string" && c.trim() ? c.trim() : null;
}

/**
 * GET /api/inquiries/notifications/assignments
 * Recent inquiries assigned to the current user (for notification center).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user.role as UserRole) ?? undefined;
    if (role === UserRole.ACCOUNTANT) {
      return NextResponse.json({ assignments: [] });
    }

    const userId = session.user.id;

    const limitRaw = request.nextUrl.searchParams.get("limit");
    const parsed =
      limitRaw !== null && limitRaw !== ""
        ? Number.parseInt(limitRaw, 10)
        : DEFAULT_TAKE;
    const take = Number.isFinite(parsed)
      ? Math.min(MAX_TAKE, Math.max(1, parsed))
      : DEFAULT_TAKE;

    const rows = await prisma.inquiry.findMany({
      where: {
        assignedToId: userId,
        assignedAt: { not: null },
      },
      orderBy: { assignedAt: "desc" },
      take,
      select: {
        id: true,
        customerName: true,
        email: true,
        message: true,
        lookingFor: true,
        assignedAt: true,
        metadata: true,
      },
    });

    const assignments = rows.map((i) => ({
      id: i.id,
      customerName: i.customerName?.trim() || i.email?.trim() || "Lead",
      country: countryFromMetadata(i.metadata),
      message: i.message?.trim() || null,
      lookingFor: i.lookingFor?.trim() || null,
      assignedAt: i.assignedAt!.toISOString(),
    }));

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("[inquiries/notifications/assignments]", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}
