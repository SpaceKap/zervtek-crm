import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canViewAllInquiries } from "@/lib/permissions"
import { randomBytes } from "crypto"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canViewAllInquiries(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Generate a unique share token
    const shareToken = randomBytes(32).toString("hex")

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: { shareToken } as any, // Type assertion to bypass Prisma type checking
      select: {
        id: true,
        name: true,
        shareToken: true,
      } as any, // Type assertion to bypass Prisma type checking
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error generating share token:", error)
    return NextResponse.json(
      { error: "Failed to generate share token" },
      { status: 500 }
    )
  }
}
