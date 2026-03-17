import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Deletes stock listings whose auto-deletion date has passed.
 * A listing is deleted when: createdAt + (autoDeleteAfterDays * 1 day) <= now.
 *
 * Call this from a cron (e.g. Vercel Cron) daily. Optional: set CRON_SECRET
 * and send Authorization: Bearer <CRON_SECRET> to protect the endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get("authorization")
      const token = authHeader?.replace(/^Bearer\s+/i, "").trim()
      if (token !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    if (typeof prisma.stockListing === "undefined") {
      return NextResponse.json(
        { error: "Stock listings not available", deleted: 0 },
        { status: 503 }
      )
    }

    const candidates = await prisma.stockListing.findMany({
      where: { autoDeleteAfterDays: { not: null } },
      select: { id: true, stockId: true, createdAt: true, autoDeleteAfterDays: true },
    })

    const now = Date.now()
    const toDelete = candidates.filter((row) => {
      const days = row.autoDeleteAfterDays!
      const expiry = row.createdAt.getTime() + days * MS_PER_DAY
      return expiry <= now
    })

    if (toDelete.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        ids: [],
        timestamp: new Date().toISOString(),
      })
    }

    const ids = toDelete.map((r) => r.id)
    await prisma.stockListing.deleteMany({ where: { id: { in: ids } } })

    return NextResponse.json({
      success: true,
      deleted: ids.length,
      ids,
      stockIds: toDelete.map((r) => r.stockId),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Stock listings auto-delete error:", error)
    return NextResponse.json(
      { error: "Failed to run stock listings auto-delete" },
      { status: 500 }
    )
  }
}
