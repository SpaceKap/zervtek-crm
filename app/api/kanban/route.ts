import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { InquiryStatus, UserRole } from "@prisma/client"
import { canViewAllInquiries } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId") // For manager to view specific user's board or "me" for own inquiries

    const isManager = session.user.role === UserRole.MANAGER || session.user.role === UserRole.ADMIN
    const canViewAll = canViewAllInquiries(session.user.role)
    
    // Determine target user ID
    let targetUserId: string | null = null
    if (!canViewAll) {
      // Sales staff always see their own inquiries
      targetUserId = session.user.id
    } else if (userId === "me" || userId === session.user.id) {
      // Manager viewing their own inquiries
      targetUserId = session.user.id
    } else if (userId && userId !== "all") {
      // Manager viewing specific user's board
      targetUserId = userId
    } else {
      // Manager viewing all inquiries (no filter)
      targetUserId = null
    }

    // Get all kanban stages - use raw query to avoid enum validation issues
    // We'll filter invalid stages manually
    let stages: Array<{
      id: string;
      name: string;
      order: number;
      color: string | null;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    }> = [];
    
    try {
      // Use raw query to bypass Prisma enum validation
      stages = await prisma.$queryRaw`
        SELECT id, name, "order", color, status, "createdAt", "updatedAt"
        FROM inquiry_pooler."KanbanStage"
        ORDER BY "order" ASC
      ` as any;
      console.log(`[Kanban API] Raw query succeeded, found ${stages.length} stages`);
    } catch (error) {
      // If raw query fails, try to delete invalid stages first, then retry
      console.error("[Kanban API] Raw query failed:", error);
      try {
        // Delete any stages with invalid statuses using raw SQL
        const validStatuses = Object.values(InquiryStatus);
        const statusList = validStatuses.map(s => `'${s}'`).join(',');
        await prisma.$executeRawUnsafe(`
          DELETE FROM inquiry_pooler."KanbanStage"
          WHERE status NOT IN (${statusList})
        `);
        console.log("[Kanban API] Deleted invalid stages, retrying query");
        // Retry raw query
        stages = await prisma.$queryRaw`
          SELECT id, name, "order", color, status, "createdAt", "updatedAt"
          FROM inquiry_pooler."KanbanStage"
          ORDER BY "order" ASC
        ` as any;
      } catch (retryError) {
        console.error("[Kanban API] Retry also failed:", retryError);
        // Last resort: return empty array and let the sync logic create stages
        stages = [];
      }
    }

    console.log(`[Kanban API] Found ${stages.length} existing stages`)

    // Define default stages
    const defaultStages = [
      { name: "New", order: 0, status: InquiryStatus.NEW, color: "#3b82f6" },
      { name: "Contacted", order: 1, status: InquiryStatus.CONTACTED, color: "#8b5cf6" },
      { name: "Qualified", order: 2, status: InquiryStatus.QUALIFIED, color: "#10b981" },
      { name: "Deposit", order: 3, status: InquiryStatus.DEPOSIT, color: "#f59e0b" },
      { name: "Closed Won", order: 4, status: InquiryStatus.CLOSED_WON, color: "#22c55e" },
      { name: "Closed Lost", order: 5, status: InquiryStatus.CLOSED_LOST, color: "#6b7280" },
      { name: "Recurring", order: 6, status: InquiryStatus.RECURRING, color: "#06b6d4" },
    ]

    // If no stages exist, create default ones
    if (stages.length === 0) {
      console.log("[Kanban API] No stages found, creating default stages")
      await prisma.kanbanStage.createMany({
        data: defaultStages,
      })
      // Re-fetch using raw query to avoid enum validation issues
      stages = await prisma.$queryRaw`
        SELECT id, name, "order", color, status, "createdAt", "updatedAt"
        FROM inquiry_pooler."KanbanStage"
        ORDER BY "order" ASC
      ` as any;
      console.log(`[Kanban API] Created ${stages.length} stages`)
    } else {
      // Sync existing stages with default values (upsert)
      console.log("[Kanban API] Syncing stages with default values")
      for (const defaultStage of defaultStages) {
        try {
          await prisma.kanbanStage.upsert({
            where: { status: defaultStage.status },
            update: {
              name: defaultStage.name,
              order: defaultStage.order,
              color: defaultStage.color,
            },
            create: defaultStage,
          })
        } catch (error) {
          console.error(`[Kanban API] Error upserting stage ${defaultStage.status}:`, error)
        }
      }
      // Re-fetch stages after sync using raw query
      stages = await prisma.$queryRaw`
        SELECT id, name, "order", color, status, "createdAt", "updatedAt"
        FROM inquiry_pooler."KanbanStage"
        ORDER BY "order" ASC
      ` as any;
      console.log(`[Kanban API] After sync, found ${stages.length} stages`)
    }

    // Build where clause for inquiries
    // IMPORTANT: Kanban only shows ASSIGNED inquiries (never show unassigned)
    const where: any = {}

    if (targetUserId !== null) {
      // Filter by specific user (including manager's own inquiries)
      // Only show assigned inquiries for this specific user
      where.assignedToId = targetUserId
    } else {
      // Manager is viewing all assigned inquiries (no user filter)
      // Only show assigned inquiries (assignedToId IS NOT NULL)
      where.assignedToId = { not: null }
    }

    // Get inquiries for the target user (only assigned inquiries)
    const inquiries = await prisma.inquiry.findMany({
      where,
      select: {
        id: true,
        source: true,
        customerName: true,
        email: true,
        phone: true,
        message: true,
        status: true,
        assignedToId: true,
        createdAt: true,
        metadata: true,
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

    // Group inquiries by status
    const inquiriesByStatus = inquiries.reduce((acc, inquiry) => {
      if (!acc[inquiry.status]) {
        acc[inquiry.status] = []
      }
      acc[inquiry.status].push(inquiry)
      return acc
    }, {} as Record<InquiryStatus, typeof inquiries>)

    // Filter out any stages with invalid statuses (not in InquiryStatus enum)
    const validStatuses = Object.values(InquiryStatus) as string[];
    const validStages = stages.filter((stage) => {
      const isValid = validStatuses.includes(stage.status);
      if (!isValid) {
        console.log(`[Kanban API] Filtering out invalid stage: ${stage.name} (${stage.status})`);
      }
      return isValid;
    });
    
    // Map stages with their inquiries, ensuring status is cast correctly
    const boardData = validStages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      order: stage.order,
      color: stage.color,
      status: stage.status as InquiryStatus,
      inquiries: inquiriesByStatus[stage.status as InquiryStatus] || [],
    }))
    
    console.log(`[Kanban API] Filtered to ${validStages.length} valid stages (removed ${stages.length - validStages.length} invalid)`);

    console.log(`[Kanban API] Returning ${boardData.length} stages with ${inquiries.length} total inquiries`)
    
    return NextResponse.json({
      stages: boardData,
      userId: targetUserId,
      isManager,
      viewMode: targetUserId === null ? "all" : targetUserId === session.user.id ? "me" : "user",
    })
  } catch (error) {
    console.error("[Kanban API] Error fetching kanban board:", error)
    if (error instanceof Error) {
      console.error("[Kanban API] Error details:", error.message, error.stack)
    }
    return NextResponse.json(
      { error: "Failed to fetch kanban board", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { inquiryId, newStatus } = body

    if (!inquiryId || !newStatus) {
      return NextResponse.json(
        { error: "Missing inquiryId or newStatus" },
        { status: 400 }
      )
    }

    if (!Object.values(InquiryStatus).includes(newStatus)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      )
    }

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
    })

    if (!inquiry) {
      return NextResponse.json(
        { error: "Inquiry not found" },
        { status: 404 }
      )
    }

    // Check permissions
    const canViewAll = canViewAllInquiries(session.user.role)
    if (
      !canViewAll &&
      inquiry.assignedToId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if this is a second attempt that's not closing as won
    const currentMetadata = (inquiry.metadata as any) || {}
    const attemptCount = currentMetadata.attemptCount || 0
    const isSecondAttempt = attemptCount >= 2
    const isNotClosedWon = newStatus !== InquiryStatus.CLOSED_WON
    
    // If it's the second attempt and not closing as won, mark as failed lead
    const updatedMetadata = isSecondAttempt && isNotClosedWon
      ? {
          ...currentMetadata,
          isFailedLead: true,
          failedAt: new Date().toISOString(),
        }
      : currentMetadata

    // Update inquiry status
    const updatedInquiry = await prisma.inquiry.update({
      where: { id: inquiryId },
      data: { 
        status: newStatus as InquiryStatus,
        metadata: updatedMetadata,
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
        action: "STATUS_CHANGED",
        previousStatus: inquiry.status,
        newStatus: newStatus as InquiryStatus,
        notes: isSecondAttempt && isNotClosedWon
          ? "Marked as failed lead after second attempt"
          : null,
      },
    })

    return NextResponse.json(updatedInquiry)
  } catch (error) {
    console.error("Error updating kanban status:", error)
    return NextResponse.json(
      { error: "Failed to update kanban status" },
      { status: 500 }
    )
  }
}
