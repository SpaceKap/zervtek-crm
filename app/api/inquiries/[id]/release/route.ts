import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
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

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: params.id },
    })

    if (!inquiry) {
      return NextResponse.json(
        { error: "Inquiry not found" },
        { status: 404 }
      )
    }

    // Check permissions - only assigned user or manager/admin can release
    const canViewAll = canViewAllInquiries(session.user.role)
    if (
      !canViewAll &&
      inquiry.assignedToId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "You can only release inquiries assigned to you" },
        { status: 403 }
      )
    }

    // Release the inquiry (unassign)
    const updatedInquiry = await prisma.inquiry.update({
      where: { id: params.id },
      data: {
        assignedToId: null,
        assignedAt: null,
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
        action: "RELEASED",
        previousStatus: inquiry.status,
        newStatus: inquiry.status,
        notes: "Inquiry released back to pool",
      },
    })

    return NextResponse.json(updatedInquiry)
  } catch (error) {
    console.error("Error releasing inquiry:", error)
    return NextResponse.json(
      { error: "Failed to release inquiry" },
      { status: 500 }
    )
  }
}
