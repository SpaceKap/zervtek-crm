import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, InquirySource, InquiryStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const MIN_LEADS_FOR_BEST_WORST_SOURCE = 5;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const whereClause: any = {};
    if (Object.keys(dateFilter).length > 0) {
      whereClause.createdAt = dateFilter;
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // --- Lead volume ---
    const [newLeadsCount7d, newLeadsCount30d, unassignedCount, total] =
      await Promise.all([
        prisma.inquiry.count({
          where: { createdAt: { gte: sevenDaysAgo } },
        }),
        prisma.inquiry.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.inquiry.count({
          where: { ...whereClause, assignedToId: null },
        }),
        prisma.inquiry.count({ where: whereClause }),
      ]);

    // --- By source (counts) ---
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
      REFERRAL: 0,
    };
    sourceCounts.forEach((item) => {
      bySource[item.source] = item._count.id;
    });

    // --- By source: won per source ---
    const sourceWonCounts = await prisma.inquiry.groupBy({
      by: ["source"],
      where: { ...whereClause, status: InquiryStatus.CLOSED_WON },
      _count: { id: true },
    });

    const sourceWon: Record<string, number> = {};
    sourceWonCounts.forEach((item) => {
      sourceWon[item.source] = item._count.id;
    });

    const bySourceEnhanced = (Object.keys(bySource) as InquirySource[]).map(
      (source) => {
        const totalSrc = bySource[source];
        const wonSrc = sourceWon[source] ?? 0;
        const conversionRate =
          totalSrc > 0 ? Math.round((wonSrc / totalSrc) * 10000) / 100 : 0;
        return {
          source,
          total: totalSrc,
          won: wonSrc,
          conversionRate,
        };
      }
    );

    let bestSource: string | null = null;
    let worstSource: string | null = null;
    const qualified = bySourceEnhanced.filter(
      (s) => s.total >= MIN_LEADS_FOR_BEST_WORST_SOURCE
    );
    if (qualified.length > 0) {
      const sorted = [...qualified].sort((a, b) => b.conversionRate - a.conversionRate);
      bestSource = sorted[0].source;
      worstSource = sorted[sorted.length - 1].source;
    }

    // --- By status & funnel ---
    const statusCounts = await prisma.inquiry.groupBy({
      by: ["status"],
      where: whereClause,
      _count: { id: true },
    });

    const funnel: Record<string, number> = {};
    (Object.values(InquiryStatus) as string[]).forEach((s) => {
      funnel[s] = 0;
    });
    statusCounts.forEach((item) => {
      funnel[item.status] = item._count.id;
    });

    const byStatus = {
      won: funnel[InquiryStatus.CLOSED_WON] ?? 0,
      lost: funnel[InquiryStatus.CLOSED_LOST] ?? 0,
      other: total - (funnel[InquiryStatus.CLOSED_WON] ?? 0) - (funnel[InquiryStatus.CLOSED_LOST] ?? 0),
    };

    const winCount = byStatus.won;
    const lossCount = byStatus.lost;
    const winRate = total > 0 ? Math.round((winCount / total) * 10000) / 100 : 0;
    const lossRate = total > 0 ? Math.round((lossCount / total) * 10000) / 100 : 0;

    // --- Failed leads ---
    const failedLeadCount = await prisma.inquiry.count({
      where: {
        ...whereClause,
        metadata: { path: ["isFailedLead"], equals: true },
      },
    });
    const assignedTotal = await prisma.inquiry.count({
      where: { ...whereClause, assignedToId: { not: null } },
    });
    const failedLeadRate =
      assignedTotal > 0
        ? Math.round((failedLeadCount / assignedTotal) * 10000) / 100
        : 0;

    // --- Second-attempt failure (raw: attemptCount >= 2 and status != CLOSED_WON) ---
    type SecondAttemptRow = { count: bigint };
    let secondAttemptFailureCount = 0;
    try {
      const dateCond =
        Object.keys(dateFilter).length > 0
          ? `AND i."createdAt" >= $1 AND i."createdAt" <= $2`
          : "";
      const params: (Date | number)[] =
        Object.keys(dateFilter).length > 0
          ? [dateFilter.gte!, dateFilter.lte!]
          : [];
      const secondAttemptResult = await prisma.$queryRawUnsafe<SecondAttemptRow[]>(
        `SELECT COUNT(*)::bigint as count FROM inquiry_pooler."Inquiry" i
         WHERE (i.metadata->>'attemptCount')::int >= 2
           AND i.status != 'CLOSED_WON'
           ${dateCond}`,
        ...params
      );
      if (secondAttemptResult.length > 0 && secondAttemptResult[0].count != null) {
        secondAttemptFailureCount = Number(secondAttemptResult[0].count);
      }
    } catch (_) {
      // ignore raw errors (e.g. invalid json)
    }

    // --- Time to first contact ---
    const withAssigned = await prisma.inquiry.findMany({
      where: { ...whereClause, assignedAt: { not: null } },
      select: { createdAt: true, assignedAt: true },
    });
    let avgTimeToFirstContactHours: number | null = null;
    let pctContactedWithin24h: number | null = null;
    if (withAssigned.length > 0) {
      const hoursList = withAssigned.map((i) => {
        const ms = (i.assignedAt!.getTime() - i.createdAt.getTime());
        return ms / (1000 * 60 * 60);
      });
      const sum = hoursList.reduce((a, b) => a + b, 0);
      avgTimeToFirstContactHours = Math.round((sum / hoursList.length) * 100) / 100;
      const within24 = hoursList.filter((h) => h <= 24).length;
      pctContactedWithin24h = Math.round((within24 / hoursList.length) * 10000) / 100;
    }

    // --- Avg time to close (won): InquiryHistory where newStatus = CLOSED_WON ---
    type CloseRow = { avg_days: number | null };
    let avgTimeToCloseWonDays: number | null = null;
    try {
      const dateCond =
        Object.keys(dateFilter).length > 0
          ? `AND i."createdAt" >= $1 AND i."createdAt" <= $2`
          : "";
      const params: (Date | number)[] =
        Object.keys(dateFilter).length > 0
          ? [dateFilter.gte!, dateFilter.lte!]
          : [];
      const closeResult = await prisma.$queryRawUnsafe<CloseRow[]>(
        `SELECT AVG(EXTRACT(EPOCH FROM (h."createdAt" - i."createdAt")) / 86400.0)::double precision as avg_days
         FROM inquiry_pooler."InquiryHistory" h
         JOIN inquiry_pooler."Inquiry" i ON i.id = h."inquiryId"
         WHERE h."newStatus" = 'CLOSED_WON'
         ${dateCond}`,
        ...params
      );
      if (
        closeResult.length > 0 &&
        closeResult[0].avg_days != null &&
        !Number.isNaN(closeResult[0].avg_days)
      ) {
        avgTimeToCloseWonDays = Math.round(closeResult[0].avg_days * 100) / 100;
      }
    } catch (_) {}

    // --- By country (normalize null/empty to "Other") ---
    type CountryRow = { country: string; total: string; won: string };
    let byCountry: { country: string; total: number; won: number; conversionRate: number }[] = [];
    try {
      const dateCond =
        Object.keys(dateFilter).length > 0
          ? `WHERE i."createdAt" >= $1 AND i."createdAt" <= $2`
          : "";
      const params: Date[] =
        Object.keys(dateFilter).length > 0
          ? [dateFilter.gte!, dateFilter.lte!]
          : [];
      const countryResult = await prisma.$queryRawUnsafe<CountryRow[]>(
        `SELECT
           COALESCE(NULLIF(TRIM(i.metadata->>'country'), ''), 'Other') AS country,
           COUNT(*)::text AS total,
           COUNT(*) FILTER (WHERE i.status = 'CLOSED_WON')::text AS won
         FROM inquiry_pooler."Inquiry" i
         ${dateCond}
         GROUP BY 1
         ORDER BY COUNT(*) DESC`,
        ...params
      );
      byCountry = countryResult.map((row) => {
        const totalC = parseInt(row.total, 10) || 0;
        const wonC = parseInt(row.won, 10) || 0;
        const conversionRate =
          totalC > 0 ? Math.round((wonC / totalC) * 10000) / 100 : 0;
        return {
          country: row.country,
          total: totalC,
          won: wonC,
          conversionRate,
        };
      });
    } catch (e) {
      console.error("Country stats error:", e);
    }

    return NextResponse.json({
      bySource,
      byStatus,
      total,
      newLeadsCount7d,
      newLeadsCount30d,
      unassignedCount,
      bySourceEnhanced,
      bestSource,
      worstSource,
      winCount,
      lossCount,
      winRate,
      lossRate,
      failedLeadCount,
      failedLeadRate,
      secondAttemptFailureCount,
      avgTimeToFirstContactHours,
      pctContactedWithin24h,
      avgTimeToCloseWonDays,
      funnel,
      byCountry,
    });
  } catch (error) {
    console.error("Error fetching inquiry stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch inquiry stats" },
      { status: 500 }
    );
  }
}
