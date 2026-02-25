import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { InquiryStatus } from "@prisma/client"
import { invalidateCachePattern } from "@/lib/cache"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    // Check permissions - only assigned user or manager can convert
    const canViewAll = session.user.role === "MANAGER"
    if (
      !canViewAll &&
      inquiry.assignedToId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { converted = true } = body

    // Update status to CLOSED_WON if converted, or keep current status
    const updatedInquiry = await prisma.inquiry.update({
      where: { id: params.id },
      data: {
        status: converted ? InquiryStatus.CLOSED_WON : inquiry.status,
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
        action: converted ? "CONVERTED" : "MARKED_NOT_CONVERTED",
        previousStatus: inquiry.status,
        newStatus: updatedInquiry.status,
      },
    })

    await invalidateCachePattern("inquiries:list:")
    await invalidateCachePattern("kanban:")

    return NextResponse.json(updatedInquiry)
  } catch (error) {
    console.error("Error converting inquiry:", error)
    return NextResponse.json(
      { error: "Failed to convert inquiry" },
      { status: 500 }
    )
  }
}
