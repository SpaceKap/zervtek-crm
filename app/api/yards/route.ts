import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageVehicleStages } from "@/lib/permissions"
import { VendorCategory } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch actual Yard records
    const yards = await prisma.yard.findMany({
      include: {
        vendor: true,
      },
      orderBy: { name: "asc" },
    })

    // Also fetch vendors with YARD category and convert them to yard-like objects
    const yardVendors = await prisma.vendor.findMany({
      where: {
        category: "YARD",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    })

    // Convert yard vendors to yard format (with vendor relation)
    const yardVendorsAsYards = yardVendors.map((vendor) => ({
      id: `vendor-${vendor.id}`, // Use a prefix to avoid ID conflicts
      name: vendor.name,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        category: VendorCategory.YARD,
      },
    }))

    // Combine both and remove duplicates by name
    const allYards = [...yards, ...yardVendorsAsYards]
    
    // Remove duplicates based on name (if a yard already exists with same name)
    const uniqueYards = allYards.filter((yard, index, self) => 
      index === self.findIndex((y) => y.name === yard.name)
    )

    return NextResponse.json(uniqueYards)
  } catch (error) {
    console.error("Error fetching yards:", error)
    return NextResponse.json(
      { error: "Failed to fetch yards" },
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

    if (!canManageVehicleStages(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, vendorId, address, phone, email } = body

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    const yard = await prisma.yard.create({
      data: {
        name,
        vendorId: vendorId || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
      },
      include: {
        vendor: true,
      },
    })

    return NextResponse.json(yard, { status: 201 })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Yard with this name already exists" },
        { status: 400 }
      )
    }
    console.error("Error creating yard:", error)
    return NextResponse.json(
      { error: "Failed to create yard" },
      { status: 500 }
    )
  }
}
