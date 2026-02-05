import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageUsers } from "@/lib/permissions"
import { UserRole } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const excludeRole = searchParams.get("excludeRole")

    // For customer assignment, allow all authenticated users to fetch (excluding ACCOUNTANT)
    // For user management, require canManageUsers permission
    if (excludeRole) {
      // Allow fetching users for customer assignment
      const where: any = {}
      if (excludeRole === "ACCOUNTANT") {
        where.role = { not: UserRole.ACCOUNTANT }
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      })

      return NextResponse.json(users)
    }

    // Original user management endpoint
    if (!canManageUsers(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        createdAt: true,
        _count: {
          select: {
            assignedInquiries: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}
