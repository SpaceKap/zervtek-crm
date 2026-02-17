import { NextRequest, NextResponse } from "next/server";
import {
  getVehicleDimensions,
  getVehicleDimensionsByName,
} from "@/lib/vehicle-catalog";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const makeId = searchParams.get("makeId");
    const modelId = searchParams.get("modelId");
    const makeName = searchParams.get("makeName");
    const modelName = searchParams.get("modelName");
    const year = searchParams.get("year");

    if (!year) {
      return NextResponse.json(
        { error: "year is required" },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum)) {
      return NextResponse.json(
        { error: "Invalid year" },
        { status: 400 }
      );
    }

    let result;
    if (makeId && modelId) {
      // Use ID-based lookup
      result = await getVehicleDimensions(makeId, modelId, yearNum);
    } else if (makeName && modelName) {
      // Use name-based lookup
      result = await getVehicleDimensionsByName(makeName, modelName, yearNum);
    } else {
      return NextResponse.json(
        {
          error:
            "Either (makeId and modelId) or (makeName and modelName) are required",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching vehicle dimensions:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicle dimensions" },
      { status: 500 }
    );
  }
}
