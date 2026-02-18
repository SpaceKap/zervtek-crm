import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { InquirySource, InquiryStatus, UserRole } from "@prisma/client"
import { canViewAllInquiries } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") as InquiryStatus | null
    const source = searchParams.get("source") as InquirySource | null
    const assignedToMe = searchParams.get("assignedToMe") === "true"
    const userId = searchParams.get("userId") // For manager filtering: "me", "all", or specific user ID
    const unassignedOnly = searchParams.get("unassignedOnly") === "true" // Explicitly request unassigned inquiries

    const isManager = session.user.role === UserRole.MANAGER || session.user.role === UserRole.ADMIN
    const canViewAll = canViewAllInquiries(session.user.role)

    // Build where clause
    const where: any = {}

    // Exclude failed leads filter (defined early so we can use it)
    const failedLeadsFilter = {
      NOT: {
        metadata: {
          path: ["isFailedLead"],
          equals: true,
        },
      },
    }

    // Handle user filtering for managers
    if (unassignedOnly) {
      // Explicitly request only unassigned inquiries
      // Build AND clause with all conditions
      const andConditions: any[] = [
        { assignedToId: null },
        failedLeadsFilter,
      ]
      
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
      }("UnassignedOnly query - AND conditions:", JSON.stringify(andConditions, null, 2))
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
    if (!unassignedOnly) {
      if (Object.keys(where).length === 0) {
        // If where is empty, just use the failed leads filter
        where.AND = [failedLeadsFilter]
      } else if (where.AND) {
        where.AND.push(failedLeadsFilter)
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
      where,
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
      if (inquiries.length > 0) {
        console.log(`Sample inquiry metadata:`, inquiries[0]?.metadata)
        console.log(`Sample inquiry assignedToId:`, inquiries[0]?.assignedToId)
      }
    }

    // Filter out failed leads as a fallback (in case Prisma JSON query doesn't work)
    const filteredInquiries = inquiries.filter((inq) => {
      const metadata = inq.metadata as any
      const isFailed = metadata?.isFailedLead === true
      if (isFailed && process.env.NODE_ENV === "development") {
        console.log(`Filtering out failed lead: ${inq.id}, metadata:`, metadata)
      }
      return !isFailed
    })

    if (process.env.NODE_ENV === "development") {
      console.log(`After filtering failed leads: ${filteredInquiries.length} inquiries`)
      console.log(`Unassigned inquiries: ${filteredInquiries.filter(i => !i.assignedToId).length}`)
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

    // Validate source
    if (!Object.values(InquirySource).includes(source)) {
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

    const inquiry = await prisma.inquiry.create({
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

    // Create history entry
    await prisma.inquiryHistory.create({
      data: {
        inquiryId: inquiry.id,
        userId: session.user.id,
        action: "CREATED",
        newStatus: InquiryStatus.NEW,
      },
    })

    return NextResponse.json(inquiry, { status: 201 })
  } catch (error) {
    console.error("Error creating inquiry:", error)
    return NextResponse.json(
      { error: "Failed to create inquiry" },
      { status: 500 }
    )
  }
}
