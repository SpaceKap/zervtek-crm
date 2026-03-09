import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, Prisma } from "@prisma/client"
import { invalidateCachePattern } from "@/lib/cache"

/**
 * Merge source inquiry INTO target inquiry.
 * Target ([id]) survives. The SOURCE inquiry's lead source is used for attribution
 * (so the card you drag on top wins for lead counting).
 * Moves vehicles from source to target, updates target.source to source.source, then deletes source.
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== UserRole.MANAGER && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Only managers and admins can merge inquiries" },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const sourceInquiryId = body.sourceInquiryId as string | undefined
    if (!sourceInquiryId || typeof sourceInquiryId !== "string") {
      return NextResponse.json(
        { error: "sourceInquiryId is required" },
        { status: 400 }
      )
    }

    const targetId = params.id
    if (sourceInquiryId === targetId) {
      return NextResponse.json(
        { error: "Source and target must be different inquiries" },
        { status: 400 }
      )
    }

    const [target, source] = await Promise.all([
      prisma.inquiry.findUnique({
        where: { id: targetId },
        include: { vehicles: true },
      }),
      prisma.inquiry.findUnique({
        where: { id: sourceInquiryId },
        include: { vehicles: true },
      }),
    ])

    if (!target) {
      return NextResponse.json({ error: "Target inquiry not found" }, { status: 404 })
    }
    if (!source) {
      return NextResponse.json({ error: "Source inquiry not found" }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      // Move vehicles from source to target
      if (source.vehicles.length > 0) {
        await tx.vehicle.updateMany({
          where: { inquiryId: sourceInquiryId },
          data: { inquiryId: targetId },
        })
      }

      // Update target: use SOURCE's lead source (the card dropped on top wins for attribution)
      await tx.inquiry.update({
        where: { id: targetId },
        data: {
          source: source.source,
          sourceId: source.sourceId ?? target.sourceId,
          // Optionally fill in target contact fields if empty and source has them
          customerName: target.customerName || source.customerName,
          email: target.email || source.email,
          phone: target.phone || source.phone,
          message: target.message || source.message,
          lookingFor: target.lookingFor || source.lookingFor,
          metadata:
            target.metadata && typeof target.metadata === "object" && source.metadata && typeof source.metadata === "object"
              ? ({ ...(source.metadata as object), ...(target.metadata as object) } as Prisma.InputJsonValue)
              : (target.metadata ?? source.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      })

      // History on target
      await tx.inquiryHistory.create({
        data: {
          inquiryId: targetId,
          userId: session.user!.id,
          action: "MERGED",
          previousStatus: target.status,
          newStatus: target.status,
          notes: `Merged from inquiry ${sourceInquiryId} (source: ${source.source}). Lead now counted as ${source.source}.`,
        },
      })

      // Delete source inquiry (history for source is kept via cascade or we could skip - InquiryHistory has inquiryId, so we need to not cascade delete if we want to keep history; schema says onDelete: Cascade for inquiry -> history, so deleting inquiry deletes its history)
      await tx.inquiry.delete({
        where: { id: sourceInquiryId },
      })
    })

    await invalidateCachePattern("inquiries:list:")
    await invalidateCachePattern("kanban:")

    const updated = await prisma.inquiry.findUnique({
      where: { id: targetId },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, image: true },
        },
        vehicles: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error merging inquiries:", error)
    return NextResponse.json(
      { error: "Failed to merge inquiries" },
      { status: 500 }
    )
  }
}
