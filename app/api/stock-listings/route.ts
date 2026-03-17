import { randomBytes } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateStaticSeo } from "@/lib/stock-listing-seo-static"
import { Prisma } from "@prisma/client"
import { z } from "zod"

const PER_PAGE_MAX = 50
const DEFAULT_PER_PAGE = 20

/** Generate stock ID: Z followed by 8 digits (time-based + random). */
function generateStockId(): string {
  const t = Date.now() % 1000000
  const r = randomBytes(1)[0]! % 100
  const num = t * 100 + r
  return `Z${num.toString().padStart(8, "0")}`
}

const createBodySchema = z.object({
  stockId: z.string().optional(),
  status: z.string().optional().default("Available"),
  fobPrice: z.number().or(z.string().transform((s) => parseFloat(String(s).replace(/,/g, "")))),
  currency: z.string().optional().default("JPY"),
  brand: z.string().optional(),
  model: z.string().optional(),
  grade: z.string().optional(),
  year: z.number().int().optional().nullable(),
  mileage: z.number().int().optional().nullable(),
  mileageVerified: z.boolean().optional().nullable(),
  transmission: z.string().optional(),
  extColor: z.string().optional(),
  fuel: z.string().optional(),
  drive: z.string().optional(),
  doors: z.number().int().optional().nullable(),
  engine: z.string().optional(),
  score: z.string().optional(),
  equipment: z.union([z.string(), z.array(z.string())]).optional().transform((v) =>
    Array.isArray(v) ? v.join(", ") : v
  ),
  photoUrls: z.array(z.string()).max(10).optional().default([]),
  seoTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  description: z.string().optional(),
  tag: z.string().optional().default("Stock Listing"),
})

/**
 * GET /api/stock-listings — Public. List with pagination.
 */
export async function GET(request: NextRequest) {
  try {
    if (typeof prisma.stockListing === "undefined") {
      return NextResponse.json(
        { error: { code: "unavailable", message: "Stock listings not available. Run database migrations." } },
        { status: 503 }
      )
    }
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const perPage = Math.min(
      PER_PAGE_MAX,
      Math.max(1, parseInt(searchParams.get("per_page") || String(DEFAULT_PER_PAGE), 10))
    )
    const status = searchParams.get("status") || undefined
    const tag = searchParams.get("tag") || undefined

    const where: Prisma.StockListingWhereInput = {}
    if (status) where.status = status
    if (tag) where.tag = tag

    const [list, total] = await Promise.all([
      prisma.stockListing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.stockListing.count({ where }),
    ])

    const totalPages = Math.ceil(total / perPage)
    const base = "/api/stock-listings"
    const q = (p: number) => {
      const params = new URLSearchParams(searchParams)
      params.set("page", String(p))
      return `${base}?${params.toString()}`
    }

    return NextResponse.json({
      data: list,
      meta: { total, page, per_page: perPage, total_pages: totalPages },
      links: {
        self: q(page),
        next: page < totalPages ? q(page + 1) : null,
        last: totalPages > 0 ? q(totalPages) : null,
      },
    })
  } catch (error) {
    console.error("Stock listings list error:", error)
    const msg = error && typeof error === "object" && "message" in error && String((error as Error).message).includes("exist")
      ? "Stock listings table may be missing. Run database migrations."
      : "Failed to list stock listings"
    return NextResponse.json(
      { error: { code: "internal_error", message: msg } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/stock-listings — Create (auth required).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: "bad_request", message: "Invalid JSON body" } },
        { status: 400 }
      )
    }
    const parsed = createBodySchema.safeParse(body)
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
    const stockId = (data.stockId ?? "").trim() || generateStockId()
    let seoTitle = data.seoTitle ?? null
    let metaDescription = data.metaDescription ?? null
    const description = data.description ?? null

    if (!seoTitle || !metaDescription) {
      const staticSeo = generateStaticSeo({
        stockId,
        brand: data.brand,
        model: data.model,
        year: data.year ?? undefined,
      })
      if (staticSeo) {
        seoTitle = seoTitle ?? staticSeo.seoTitle
        metaDescription = metaDescription ?? staticSeo.metaDescription
      }
    }

    const listing = await prisma.stockListing.create({
      data: {
        stockId,
        status: data.status,
        fobPrice: data.fobPrice,
        currency: data.currency,
        brand: data.brand ?? null,
        model: data.model ?? null,
        grade: data.grade ?? null,
        year: data.year ?? null,
        mileage: data.mileage ?? null,
        mileageVerified: data.mileageVerified ?? false,
        transmission: data.transmission ?? null,
        extColor: data.extColor ?? null,
        fuel: data.fuel ?? null,
        drive: data.drive ?? null,
        doors: data.doors ?? null,
        engine: data.engine ?? null,
        score: data.score ?? null,
        equipment: data.equipment ?? null,
        photoUrls: data.photoUrls.length ? (data.photoUrls as Prisma.InputJsonValue) : undefined,
        seoTitle,
        metaDescription,
        description,
        tag: data.tag,
        createdById: session.user.id,
      },
    })

    return NextResponse.json(
      { data: listing },
      { status: 201, headers: { Location: `/api/stock-listings/${listing.id}` } }
    )
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: { code: "conflict", message: "A listing with this Stock ID already exists" } },
        { status: 409 }
      )
    }
    console.error("Stock listing create error:", error)
    const msg = error && typeof error === "object" && "message" in error && String((error as Error).message).includes("exist")
      ? "Stock listings table may be missing. Run database migrations."
      : "Failed to create stock listing"
    return NextResponse.json(
      { error: { code: "internal_error", message: msg } },
      { status: 500 }
    )
  }
}
