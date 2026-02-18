import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { InquiryStatus, UserRole } from "@prisma/client"
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
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        history: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
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

    return NextResponse.json(inquiry)
  } catch (error) {
    console.error("Error fetching inquiry:", error)
    return NextResponse.json(
      { error: "Failed to fetch inquiry" },
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

    // Check permissions - only assigned user or manager can update
    const canViewAll = canViewAllInquiries(session.user.role)
    if (
      !canViewAll &&
      inquiry.assignedToId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let body: any
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      )
    }

    const {
      customerName,
      email,
      phone,
      message,
      lookingFor,
      status,
      metadata,
    } = body

    const updateData: any = {}
    if (customerName !== undefined) updateData.customerName = customerName
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (message !== undefined) updateData.message = message
    if (status !== undefined) {
      if (!Object.values(InquiryStatus).includes(status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        )
      }
      updateData.status = status
    }
    if (metadata !== undefined || lookingFor !== undefined) {
      // Get current metadata to merge with
      const currentInquiry = await prisma.inquiry.findUnique({
        where: { id: params.id },
        select: { metadata: true },
      })
      const currentMetadata = (currentInquiry?.metadata as any) || {}
      updateData.metadata = {
        ...currentMetadata,
        ...(metadata || {}),
        ...(lookingFor !== undefined ? { lookingFor } : {}),
      }
    }

    const updatedInquiry = await prisma.inquiry.update({
      where: { id: params.id },
      data: updateData,
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

    // Create history entry if status changed
    if (status && status !== inquiry.status) {
      await prisma.inquiryHistory.create({
        data: {
          inquiryId: inquiry.id,
          userId: session.user.id,
          action: "STATUS_CHANGED",
          previousStatus: inquiry.status,
          newStatus: status as InquiryStatus,
        },
      })
    }

    return NextResponse.json(updatedInquiry)
  } catch (error) {
    console.error("Error updating inquiry:", error)
    return NextResponse.json(
      { error: "Failed to update inquiry" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only allow avi@zervtek.com to delete inquiries
    if (session.user.email !== "avi@zervtek.com") {
      return NextResponse.json(
        { error: "Forbidden: Only avi@zervtek.com can delete inquiries" },
        { status: 403 }
      )
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

    // Delete the inquiry permanently
    await prisma.inquiry.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting inquiry:", error)
    return NextResponse.json(
      { error: "Failed to delete inquiry" },
      { status: 500 }
    )
  }
}
