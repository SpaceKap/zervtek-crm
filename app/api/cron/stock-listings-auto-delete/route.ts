import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Cron job: delete stock listings whose auto-deletion date has passed.
 * The CRM does not call this; a scheduler (e.g. Vercel Cron) hits this route.
 * Listings are deleted directly via Prisma – no API flow for the CRM.
 */
export async function GET(request: NextRequest) {
  try {
    if (typeof prisma.stockListing === "undefined") {
      return NextResponse.json(
        { success: false, error: "Stock listings not available" },
        { status: 503 }
      )
    }

    const now = new Date()
    const listings = await prisma.stockListing.findMany({
      where: { autoDeleteAfterDays: { not: null } },
      select: { id: true, createdAt: true, autoDeleteAfterDays: true },
    })

    const toDelete = listings.filter((row) => {
      const days = row.autoDeleteAfterDays ?? 0
      const expiry = new Date(row.createdAt)
      expiry.setDate(expiry.getDate() + days)
      return expiry <= now
    })

    if (toDelete.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        timestamp: now.toISOString(),
      })
    }

    const result = await prisma.stockListing.deleteMany({
      where: { id: { in: toDelete.map((r) => r.id) } },
    })

    return NextResponse.json({
      success: true,
      deleted: result.count,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error("Stock listings auto-delete cron error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to run auto-delete" },
      { status: 500 }
    )
  }
}
