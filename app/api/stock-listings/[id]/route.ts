import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateStockListingSeo } from "@/lib/stock-listing-seo"
import { Prisma } from "@prisma/client"
import { z } from "zod"

const updateBodySchema = z.object({
  stockId: z.string().min(1).optional(),
  status: z.string().optional(),
  fobPrice: z.number().or(z.string().transform((s) => parseFloat(s))).optional(),
  currency: z.string().optional(),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  grade: z.string().optional().nullable(),
  year: z.number().int().optional().nullable(),
  mileage: z.number().int().optional().nullable(),
  transmission: z.string().optional().nullable(),
  extColor: z.string().optional().nullable(),
  fuel: z.string().optional().nullable(),
  drive: z.string().optional().nullable(),
  doors: z.number().int().optional().nullable(),
  engine: z.string().optional().nullable(),
  score: z.string().optional().nullable(),
  equipment: z.string().optional().nullable(),
  photoUrls: z.array(z.string()).max(10).optional(),
  seoTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  tag: z.string().optional(),
})

/**
 * GET /api/stock-listings/:id — Public. Single listing.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const listing = await prisma.stockListing.findUnique({
      where: { id },
    })
    if (!listing) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Stock listing not found" } },
        { status: 404 }
      )
    }
    return NextResponse.json({ data: listing })
  } catch (error) {
    console.error("Stock listing get error:", error)
    return NextResponse.json(
      { error: { code: "internal_error", message: "Failed to fetch stock listing" } },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/stock-listings/:id — Update (auth required).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      )
    }

    const { id } = await params
    const existing = await prisma.stockListing.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Stock listing not found" } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const parsed = updateBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "validation_error",
            message: "Validation failed",
            details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
          },
        },
        { status: 422 }
      )
    }

    const data = parsed.data
    const update: Prisma.StockListingUpdateInput = {}
    if (data.stockId !== undefined) update.stockId = data.stockId
    if (data.status !== undefined) update.status = data.status
    if (data.fobPrice !== undefined) update.fobPrice = data.fobPrice
    if (data.currency !== undefined) update.currency = data.currency
    if (data.brand !== undefined) update.brand = data.brand
    if (data.model !== undefined) update.model = data.model
    if (data.grade !== undefined) update.grade = data.grade
    if (data.year !== undefined) update.year = data.year
    if (data.mileage !== undefined) update.mileage = data.mileage
    if (data.transmission !== undefined) update.transmission = data.transmission
    if (data.extColor !== undefined) update.extColor = data.extColor
    if (data.fuel !== undefined) update.fuel = data.fuel
    if (data.drive !== undefined) update.drive = data.drive
    if (data.doors !== undefined) update.doors = data.doors
    if (data.engine !== undefined) update.engine = data.engine
    if (data.score !== undefined) update.score = data.score
    if (data.equipment !== undefined) update.equipment = data.equipment
    if (data.photoUrls !== undefined) update.photoUrls = data.photoUrls as Prisma.InputJsonValue
    if (data.seoTitle !== undefined) update.seoTitle = data.seoTitle
    if (data.metaDescription !== undefined) update.metaDescription = data.metaDescription
    if (data.description !== undefined) update.description = data.description
    if (data.tag !== undefined) update.tag = data.tag

    const listing = await prisma.stockListing.update({
      where: { id },
      data: update,
    })
    return NextResponse.json({ data: listing })
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: { code: "conflict", message: "A listing with this Stock ID already exists" } },
        { status: 409 }
      )
    }
    console.error("Stock listing update error:", error)
    return NextResponse.json(
      { error: { code: "internal_error", message: "Failed to update stock listing" } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/stock-listings/:id — Delete (auth required).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      )
    }

    const { id } = await params
    await prisma.stockListing.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json(
        { error: { code: "not_found", message: "Stock listing not found" } },
        { status: 404 }
      )
    }
    console.error("Stock listing delete error:", error)
    return NextResponse.json(
      { error: { code: "internal_error", message: "Failed to delete stock listing" } },
      { status: 500 }
    )
  }
}
