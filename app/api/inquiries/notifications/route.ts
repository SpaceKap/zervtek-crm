import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { canViewAllInquiries } from "@/lib/permissions";

/**
 * GET /api/inquiries/notifications?since=ISO_DATE
 * Returns inquiry IDs for notification purposes (no cache).
 * - newInquiryIds: inquiries created after `since` (for managers/admins)
 * - assignedToMeIds: inquiries assigned to current user after `since` (for sales/managers)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sinceParam = request.nextUrl.searchParams.get("since");
    const since = sinceParam ? new Date(sinceParam) : new Date(0);
    if (isNaN(since.getTime())) {
      return NextResponse.json(
        { error: "Invalid since parameter" },
        { status: 400 }
      );
    }

    const role = (session.user.role as UserRole) ?? undefined;
    const isManager = role === UserRole.MANAGER || role === UserRole.ADMIN;
    const userId = session.user.id;

    let newInquiryIds: string[] = [];
    if (isManager && canViewAllInquiries(role)) {
      const newInquiries = await prisma.inquiry.findMany({
        where: { createdAt: { gt: since } },
        select: { id: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      newInquiryIds = newInquiries.map((i) => i.id);
    }

    // Inquiries assigned to current user after `since` (assignedAt or createdAt if just created and already assigned)
    const assignedToMe = await prisma.inquiry.findMany({
      where: {
        assignedToId: userId,
        OR: [
          { assignedAt: { gt: since } },
          { assignedAt: null, createdAt: { gt: since } },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const assignedToMeIds = assignedToMe.map((i) => i.id);

    const at = new Date().toISOString();
    return NextResponse.json({
      newInquiryIds,
      assignedToMeIds,
      at,
    });
  } catch (error) {
    console.error("[inquiries/notifications]", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
