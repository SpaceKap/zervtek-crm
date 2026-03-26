import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prismaUserNotification } from "@/lib/prisma-user-notification"

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 30

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unreadOnly") === "1" || searchParams.get("unreadOnly") === "true"
    const limitRaw = parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10)
    const limit = Math.min(Math.max(1, Number.isFinite(limitRaw) ? limitRaw : DEFAULT_LIMIT), MAX_LIMIT)

    const userId = session.user.id

    const where = {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    }

    const un = prismaUserNotification()
    const [notifications, unreadCount] = await Promise.all([
      un.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          link: true,
          inquiryId: true,
          readAt: true,
          createdAt: true,
          actorUserId: true,
        },
      }),
      un.count({
        where: { userId, readAt: null },
      }),
    ])

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const markAllRead = Boolean(body.markAllRead)
    const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : []

    const userId = session.user.id
    const now = new Date()

    const un = prismaUserNotification()

    if (markAllRead) {
      await un.updateMany({
        where: { userId, readAt: null },
        data: { readAt: now },
      })
      return NextResponse.json({ ok: true })
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: "Provide markAllRead or ids" }, { status: 400 })
    }

    await un.updateMany({
      where: { userId, id: { in: ids } },
      data: { readAt: now },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error updating notifications:", error)
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 })
  }
}
