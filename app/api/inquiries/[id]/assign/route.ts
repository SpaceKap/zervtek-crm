import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import { canAssignInquiry } from "@/lib/permissions"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canAssignInquiry(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: params.id },
    })

    if (!inquiry) {
      return NextResponse.json(
        { error: "Inquiry not found" },
        { status: 404 }
      )
    }

    // Check if already assigned to someone else (unless manager)
    if (
      inquiry.assignedToId &&
      inquiry.assignedToId !== session.user.id &&
      session.user.role !== UserRole.MANAGER
    ) {
      return NextResponse.json(
        { error: "Inquiry already assigned to another user" },
        { status: 400 }
      )
    }

    // If inquiry was previously assigned to someone else, store that info in metadata
    const previousAssigneeId = inquiry.assignedToId
    const previousAssignee = previousAssigneeId
      ? await prisma.user.findUnique({
          where: { id: previousAssigneeId },
          select: { id: true, name: true, email: true },
        })
      : null

    // Build metadata with previous assignee info if exists
    const currentMetadata = (inquiry.metadata as any) || {}
    const attemptCount = currentMetadata.attemptCount || 0
    const updatedMetadata = {
      ...currentMetadata,
      attemptCount: attemptCount + 1,
      ...(previousAssignee && {
        previouslyTriedBy: {
          userId: previousAssignee.id,
          userName: previousAssignee.name || previousAssignee.email,
          triedAt: inquiry.assignedAt || inquiry.createdAt,
        },
      }),
    }

    // Assign to current user
    const updatedInquiry = await prisma.inquiry.update({
      where: { id: params.id },
      data: {
        assignedToId: session.user.id,
        assignedAt: new Date(),
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
        action: "ASSIGNED",
        newStatus: inquiry.status,
        notes: previousAssignee
          ? `Previously tried by ${previousAssignee.name || previousAssignee.email}`
          : null,
      },
    })

    return NextResponse.json(updatedInquiry)
  } catch (error) {
    console.error("Error assigning inquiry:", error)
    return NextResponse.json(
      { error: "Failed to assign inquiry" },
      { status: 500 }
    )
  }
}
