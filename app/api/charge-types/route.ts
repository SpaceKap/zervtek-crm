import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth, canManageUsers } from "@/lib/permissions"
import { ChargeCategory } from "@prisma/client"

export async function GET() {
  try {
    await requireAuth()

    const chargeTypes = await prisma.chargeType.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    })

    return NextResponse.json(chargeTypes)
  } catch (error) {
    console.error("Error fetching charge types:", error)
    return NextResponse.json(
      { error: "Failed to fetch charge types" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManageUsers(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, category } = body

    if (!name) {
      return NextResponse.json(
        { error: "Charge type name is required" },
        { status: 400 }
      )
    }

    const chargeType = await prisma.chargeType.create({
      data: {
        name: String(name),
        category: (category as ChargeCategory) || ChargeCategory.CUSTOM,
      },
    })

    return NextResponse.json(chargeType, { status: 201 })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Charge type with this name already exists" },
        { status: 400 }
      )
    }
    console.error("Error creating charge type:", error)
    return NextResponse.json(
      { error: "Failed to create charge type" },
      { status: 500 }
    )
  }
}
