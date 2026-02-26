import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { InquirySource, InquiryStatus, UserRole } from "@prisma/client"
import { canViewAllInquiries } from "@/lib/permissions"
import { getCached, invalidateCachePattern, cacheKeyFromSearchParams } from "@/lib/cache"

const INQUIRIES_LIST_TTL = 60

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const cacheKey = `inquiries:list:${session.user.id}:${cacheKeyFromSearchParams(searchParams)}`
    const filteredInquiries = await getCached(
      cacheKey,
      async () => {
        const status = searchParams.get("status") as InquiryStatus | null
        const source = searchParams.get("source") as InquirySource | null
        const assignedToMe = searchParams.get("assignedToMe") === "true"
        const userId = searchParams.get("userId")
        const unassignedOnly = searchParams.get("unassignedOnly") === "true"

        const canViewAll = canViewAllInquiries(session.user.role)

        const where: Record<string, unknown> = {}

    // Exclude failed leads filter (defined early so we can use it)
    // IMPORTANT: Prisma JSON path queries can fail with null/undefined metadata
    // We'll filter failed leads client-side after fetching to ensure reliability
    // For now, we'll skip the Prisma-level filter and rely on client-side filtering
    // This ensures inquiries with null metadata are included
    const failedLeadsFilter = null // Temporarily disabled - using client-side filter only

    // Handle user filtering for managers
    if (unassignedOnly) {
      // Explicitly request only unassigned inquiries
      // Build AND clause with all conditions
      const andConditions: any[] = [
        { assignedToId: null },
      ]
      // Only add failed leads filter if it's defined (currently disabled)
      if (failedLeadsFilter) {
        andConditions.push(failedLeadsFilter)
      }
      
      // Add status filter if provided
      if (status) {
        andConditions.push({ status })
      }
      
      // Add source filter if provided
      if (source) {
        andConditions.push({ source })
      }
      
      where.AND = andConditions
      
      if (process.env.NODE_ENV === "development") {
        console.log("UnassignedOnly query - AND conditions:", JSON.stringify(andConditions, null, 2))
      }
    } else if (canViewAll) {
      // Add status and source filters
      if (status) {
        where.status = status
      }

      if (source) {
        where.source = source
      }
      if (userId === "me" || (assignedToMe && !userId)) {
        // Manager viewing their own inquiries
        where.assignedToId = session.user.id
      } else if (userId && userId !== "all") {
        // Manager viewing specific user's inquiries
        where.assignedToId = userId
      }
      // If userId is "all" or not provided, show all inquiries (including unassigned)
      // No filter applied - will show both assigned and unassigned
      // This allows managers to see unassigned inquiries on the dashboard
    } else {
      // Sales staff can only see their own inquiries + unassigned ones
      // Also include inquiries that were previously tried by others but are now available again
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      
      where.OR = [
        { assignedToId: session.user.id },
        { assignedToId: null },
        // Include inquiries that were assigned more than a month ago and not closed won
        {
          AND: [
            { assignedToId: { not: null } },
            { assignedAt: { lte: oneMonthAgo } },
            { status: { not: "CLOSED_WON" } },
          ],
        },
      ]

      if (assignedToMe) {
        where.assignedToId = session.user.id
        delete where.OR
      }
    }

    // Exclude failed leads - add to AND clause (unless already added for unassignedOnly)
    // Currently disabled - relying on client-side filter for reliability
    if (!unassignedOnly && failedLeadsFilter) {
      if (Object.keys(where).length === 0) {
        where.AND = [failedLeadsFilter]
      } else if (where.AND) {
        (where.AND as unknown[]).push(failedLeadsFilter)
      } else {
        // Convert existing direct properties to AND array to properly combine with failed leads filter
        const existingConditions: any[] = []
        // Collect all direct properties (not AND/OR) into conditions
        Object.keys(where).forEach((key) => {
          if (key !== "AND" && key !== "OR" && where[key as keyof typeof where] !== undefined) {
            existingConditions.push({ [key]: where[key as keyof typeof where] })
            delete (where as any)[key]
          }
        })
        existingConditions.push(failedLeadsFilter)
        where.AND = existingConditions
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log("Inquiries API query where clause:", JSON.stringify(where, null, 2))
      console.log("unassignedOnly:", unassignedOnly, "status:", status, "source:", source)
    }

        const inquiries = await prisma.inquiry.findMany({
          where: where as any,
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        })

        if (process.env.NODE_ENV === "development") {
          console.log(`Inquiries API returned ${inquiries.length} inquiries`)
        }

        return inquiries.filter((inq) => {
          const metadata = inq.metadata as { isFailedLead?: boolean } | null
          return !metadata?.isFailedLead
        })
      },
      INQUIRIES_LIST_TTL
    )

    if (process.env.NODE_ENV === "development") {
      console.log(`After filtering failed leads: ${filteredInquiries.length} inquiries`)
    }

    return NextResponse.json(filteredInquiries)
  } catch (error) {
    console.error("Error fetching inquiries:", error)
    return NextResponse.json(
      { error: "Failed to fetch inquiries" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      source,
      sourceId,
      customerName,
      email,
      phone,
      message,
      lookingFor,
      metadata,
      assignToId,
      status,
    } = body

    // Validate source (allow REFERRAL explicitly in case generated client is from before it was added)
    const validSources = new Set([
      ...Object.values(InquirySource),
      "REFERRAL",
    ] as string[])
    if (!validSources.has(source)) {
      return NextResponse.json(
        { error: "Invalid source" },
        { status: 400 }
      )
    }

    // Handle assignment logic
    let assignedToId: string | null = null
    const isManager = session.user.role === UserRole.MANAGER || session.user.role === UserRole.ADMIN

    if (assignToId) {
      if (assignToId === "me") {
        // Assign to current user
        assignedToId = session.user.id
      } else if (isManager) {
        // Manager can assign to anyone
        assignedToId = assignToId
      } else {
        // Non-managers can only assign to themselves
        assignedToId = session.user.id
      }
    } else if (!isManager) {
      // Non-managers automatically assign to themselves
      assignedToId = session.user.id
    }

    let inquiry
    try {
      inquiry = await prisma.inquiry.create({
        data: {
          source: source as InquirySource,
          sourceId: sourceId || null,
          customerName: customerName || null,
          email: email || null,
          phone: phone || null,
          message: message || null,
          metadata: {
            ...(metadata || {}),
            ...(lookingFor ? { lookingFor } : {}),
          },
          status: (status as InquiryStatus) || InquiryStatus.NEW,
          assignedToId: assignedToId,
          assignedAt: assignedToId ? new Date() : null,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      })
    } catch (createError: unknown) {
      const msg = createError instanceof Error ? createError.message : String(createError)
      if (msg.includes("REFERRAL") || msg.includes("InquirySource") || msg.includes("enum")) {
        return NextResponse.json(
          {
            error:
              "Database schema is out of date: REFERRAL source is not in the database. Please run migrations (e.g. ./deploy or prisma migrate deploy).",
          },
          { status: 503 }
        )
      }
      throw createError
    }

    // Create history entry
    await prisma.inquiryHistory.create({
      data: {
        inquiryId: inquiry.id,
        userId: session.user.id,
        action: "CREATED",
        newStatus: InquiryStatus.NEW,
      },
    })

    await invalidateCachePattern("inquiries:list:")
    await invalidateCachePattern("kanban:")

    return NextResponse.json(inquiry, { status: 201 })
  } catch (error) {
    console.error("Error creating inquiry:", error)
    return NextResponse.json(
      { error: "Failed to create inquiry" },
      { status: 500 }
    )
  }
}
