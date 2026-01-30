import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, InquirySource, InquiryStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers, admins, and back-office staff can access
    if (
      session.user.role !== UserRole.MANAGER &&
      session.user.role !== UserRole.ADMIN &&
      session.user.role !== UserRole.BACK_OFFICE_STAFF
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      dateFilter.lte = end;
    }

    const whereClause: any = {};
    if (Object.keys(dateFilter).length > 0) {
      whereClause.createdAt = dateFilter;
    }

    // Get counts by source
    const sourceCounts = await prisma.inquiry.groupBy({
      by: ["source"],
      where: whereClause,
      _count: { id: true },
    });

    const bySource: Record<InquirySource, number> = {
      WHATSAPP: 0,
      EMAIL: 0,
      WEB: 0,
      CHATBOT: 0,
      JCT_STOCK_INQUIRY: 0,
      STOCK_INQUIRY: 0,
      ONBOARDING_FORM: 0,
      CONTACT_US_INQUIRY_FORM: 0,
      HERO_INQUIRY: 0,
      INQUIRY_FORM: 0,
    };

    sourceCounts.forEach((item) => {
      bySource[item.source] = item._count.id;
    });

    // Get counts by status
    const statusCounts = await prisma.inquiry.groupBy({
      by: ["status"],
      where: whereClause,
      _count: { id: true },
    });

    const byStatus = {
      won: 0,
      lost: 0,
      other: 0,
    };

    statusCounts.forEach((item) => {
      if (item.status === InquiryStatus.CLOSED_WON) {
        byStatus.won = item._count.id;
      } else if (item.status === InquiryStatus.CLOSED_LOST) {
        byStatus.lost = item._count.id;
      } else {
        byStatus.other += item._count.id;
      }
    });

    // Get total count
    const total = await prisma.inquiry.count({
      where: whereClause,
    });

    return NextResponse.json({
      bySource,
      byStatus,
      total,
    });
  } catch (error) {
    console.error("Error fetching inquiry stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch inquiry stats" },
      { status: 500 }
    );
  }
}
