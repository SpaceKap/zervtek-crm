import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins, managers, and back-office staff can view failed leads
    if (
      session.user.role !== UserRole.ADMIN &&
      session.user.role !== UserRole.MANAGER &&
      session.user.role !== UserRole.BACK_OFFICE_STAFF
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const previouslyTriedById = searchParams.get("previouslyTriedById")

    const andConditions: any[] = [
      { metadata: { path: ["isFailedLead"], equals: true } },
    ]

    if (previouslyTriedById) {
      andConditions.push({
        metadata: { path: ["previouslyTriedBy", "userId"], equals: previouslyTriedById },
      })
    }

    if (startDate || endDate) {
      const dateFilter: any = {}
      if (startDate) dateFilter.gte = new Date(startDate)
      if (endDate) dateFilter.lte = new Date(endDate + "T23:59:59.999Z")
      andConditions.push({ updatedAt: dateFilter })
    }

    const where = andConditions.length > 1 ? { AND: andConditions } : andConditions[0]

    const failedLeads = await prisma.inquiry.findMany({
      where,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    // Transform the data to include metadata info
    const transformedLeads = failedLeads.map((lead) => {
      const metadata = (lead.metadata as any) || {}
      const previouslyTriedBy = metadata.previouslyTriedBy || null
      
      return {
        id: lead.id,
        source: lead.source,
        customerName: lead.customerName,
        email: lead.email,
        phone: lead.phone,
        message: lead.message,
        status: lead.status,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        assignedAt: lead.assignedAt,
        currentAssignee: lead.assignedTo
          ? {
              id: lead.assignedTo.id,
              name: lead.assignedTo.name,
              email: lead.assignedTo.email,
            }
          : null,
        previouslyTriedBy: previouslyTriedBy
          ? {
              userId: previouslyTriedBy.userId,
              userName: previouslyTriedBy.userName,
              triedAt: previouslyTriedBy.triedAt,
            }
          : null,
        failedAt: metadata.failedAt || lead.updatedAt,
        attemptCount: metadata.attemptCount || 0,
        metadata: lead.metadata,
      }
    })

    return NextResponse.json(transformedLeads)
  } catch (error) {
    console.error("Error fetching failed leads:", error)
    return NextResponse.json(
      { error: "Failed to fetch failed leads" },
      { status: 500 }
    )
  }
}
