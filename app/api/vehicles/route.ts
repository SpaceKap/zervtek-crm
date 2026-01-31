import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const vin = searchParams.get("vin")

    const where: any = {}
    if (vin) {
      where.vin = { contains: vin, mode: "insensitive" as const }
    } else if (search) {
      where.OR = [
        { vin: { contains: search, mode: "insensitive" as const } },
        { make: { contains: search, mode: "insensitive" as const } },
        { model: { contains: search, mode: "insensitive" as const } },
      ]
    }

    // All authenticated users can see all vehicles (universal access)
    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json(vehicles)
  } catch (error) {
    console.error("Error fetching vehicles:", error)
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const { vin, make, model, year, price, inquiryId } = body

    if (!vin) {
      return NextResponse.json(
        { error: "VIN is required" },
        { status: 400 }
      )
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        vin,
        make: make || null,
        model: model || null,
        year: year ? parseInt(year) : null,
        price: price ? parseFloat(price) : null,
        inquiryId: inquiryId || null,
      },
    })

    return NextResponse.json(vehicle, { status: 201 })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Vehicle with this VIN already exists" },
        { status: 400 }
      )
    }
    console.error("Error creating vehicle:", error)
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    )
  }
}
