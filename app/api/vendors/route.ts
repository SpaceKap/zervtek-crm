import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"
import { VendorCategory } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get("category") as VendorCategory | null

    const where: any = {}
    
    // If specific category is provided, use it
    if (category) {
      where.category = category
    }

    // Optimize: Only fetch necessary fields
    const vendors = await prisma.vendor.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        category: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    })

    // Return vendors without aggressive caching to ensure updates are visible immediately
    const response = NextResponse.json(vendors)
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    return response
  } catch (error) {
    console.error("Error fetching vendors:", error)
    return NextResponse.json(
      { error: "Failed to fetch vendors" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const { name, email, category } = body

    if (!name) {
      return NextResponse.json(
        { error: "Vendor name is required" },
        { status: 400 }
      )
    }

    // Use provided category or default to DEALERSHIP
    // Prisma will validate the enum value
    const vendor = await prisma.vendor.create({
      data: { 
        name,
        email: email || null,
        category: (category as VendorCategory) || VendorCategory.DEALERSHIP,
      },
    })

    return NextResponse.json(vendor, { status: 201 })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Vendor with this name already exists" },
        { status: 400 }
      )
    }
    console.error("Error creating vendor:", error)
    // Return more detailed error message
    const errorMessage = error.message || "Failed to create vendor"
    return NextResponse.json(
      { error: errorMessage, details: error.code || "Unknown error" },
      { status: 500 }
    )
  }
}
