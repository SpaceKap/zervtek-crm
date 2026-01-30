import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canViewAllInquiries } from "@/lib/permissions"

export async function GET(
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
      select: {
        id: true,
        metadata: true,
        assignedToId: true,
      },
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
      inquiry.assignedToId !== session.user.id &&
      inquiry.assignedToId !== null
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const metadata = inquiry.metadata as any || {}
    const notes = metadata.notes || ""

    return NextResponse.json({ notes })
  } catch (error) {
    console.error("Error fetching notes:", error)
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    // Check permissions - only assigned user or manager/admin can update notes
    const canViewAll = canViewAllInquiries(session.user.role)
    if (
      !canViewAll &&
      inquiry.assignedToId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "You can only edit notes for inquiries assigned to you" },
        { status: 403 }
      )
    }

    const { notes } = await request.json()

    // Update metadata with notes
    const metadata = (inquiry.metadata as any) || {}
    const updatedMetadata = {
      ...metadata,
      notes: notes || "",
    }

    const updatedInquiry = await prisma.inquiry.update({
      where: { id: params.id },
      data: {
        metadata: updatedMetadata,
      },
    })

    // Create history entry
    await prisma.inquiryHistory.create({
      data: {
        inquiryId: inquiry.id,
        userId: session.user.id,
        action: "NOTES_UPDATED",
        previousStatus: inquiry.status,
        newStatus: inquiry.status,
        notes: notes ? `Notes updated: ${notes.substring(0, 100)}${notes.length > 100 ? "..." : ""}` : "Notes cleared",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating notes:", error)
    return NextResponse.json(
      { error: "Failed to update notes" },
      { status: 500 }
    )
  }
}
