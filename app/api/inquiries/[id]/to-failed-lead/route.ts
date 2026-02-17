import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canViewAllInquiries } from "@/lib/permissions"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const inquiryId = params.id
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!inquiry) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 })
    }

    const canViewAll = canViewAllInquiries(session.user.role)
    if (!canViewAll && inquiry.assignedToId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const currentMetadata = (inquiry.metadata as any) || {}
    const previouslyTriedBy = inquiry.assignedTo
      ? {
          userId: inquiry.assignedTo.id,
          userName: inquiry.assignedTo.name || inquiry.assignedTo.email,
          triedAt: new Date().toISOString(),
        }
      : null

    const updatedMetadata = {
      ...currentMetadata,
      isFailedLead: true,
      failedAt: new Date().toISOString(),
      previouslyTriedBy: previouslyTriedBy || currentMetadata.previouslyTriedBy,
      attemptCount: (currentMetadata.attemptCount || 0) + 1,
    }

    await prisma.inquiry.update({
      where: { id: inquiryId },
      data: {
        metadata: updatedMetadata,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error moving inquiry to failed leads:", error)
    return NextResponse.json(
      { error: "Failed to move inquiry to failed leads" },
      { status: 500 }
    )
  }
}
