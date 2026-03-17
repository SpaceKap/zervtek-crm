import { NextResponse } from "next/server"
import { getMakesAndModels } from "@/lib/vehicle-catalog"

/**
 * GET /api/stock-listings/catalog
 * Returns unique makes and models from the vehicle catalog for dropdowns.
 * Auth optional (used by dashboard upload form).
 */
export async function GET() {
  try {
    const { makes, modelsByMake } = await getMakesAndModels()
    return NextResponse.json({
      data: { makes, modelsByMake },
    })
  } catch (error) {
    console.error("Stock listings catalog error:", error)
    return NextResponse.json(
      { error: { code: "catalog_error", message: "Failed to load catalog" } },
      { status: 500 }
    )
  }
}
