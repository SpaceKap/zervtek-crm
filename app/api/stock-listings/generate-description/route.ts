import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { generateStockListingDescription } from "@/lib/stock-listing-seo"
import { z } from "zod"

const bodySchema = z.object({
  brand: z.string().optional(),
  model: z.string().optional(),
  grade: z.string().optional(),
  year: z.number().int().optional().nullable(),
  mileage: z.number().int().optional().nullable(),
  transmission: z.string().optional(),
  extColor: z.string().optional(),
  fuel: z.string().optional(),
  drive: z.string().optional(),
  doors: z.number().int().optional().nullable(),
  engine: z.string().optional(),
  score: z.string().optional(),
  equipment: z.string().optional(),
})

/**
 * POST /api/stock-listings/generate-description — Generate description with AI (auth required).
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

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "validation_error", message: "Validation failed" } },
        { status: 422 }
      )
    }

    const description = await generateStockListingDescription(parsed.data)
    if (!description) {
      return NextResponse.json(
        { error: { code: "unavailable", message: "Description generation is not available (OPENAI_API_KEY required)" } },
        { status: 503 }
      )
    }

    return NextResponse.json({ data: { description } })
  } catch (error) {
    console.error("Generate description error:", error)
    return NextResponse.json(
      { error: { code: "internal_error", message: "Failed to generate description" } },
      { status: 500 }
    )
  }
}
