import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Load and parse lookup tables for companies and models
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "companies" or "models"

    if (type === "companies") {
      const csvPath = path.join(process.cwd(), "data", "auct_companies.csv");
      const csvContent = fs.readFileSync(csvPath, "utf-8");
      const lines = csvContent.split("\n").filter((l) => l.trim());

      const companies: { company_id: number; name: string; country: string }[] =
        [];

      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        if (parts.length >= 3) {
          companies.push({
            company_id: parseInt(parts[0], 10),
            name: parts[1],
            country: parts[2],
          });
        }
      }

      return NextResponse.json(companies);
    } else if (type === "models") {
      const csvPath = path.join(process.cwd(), "data", "auct_models.csv");
      const csvContent = fs.readFileSync(csvPath, "utf-8");
      const lines = csvContent.split("\n").filter((l) => l.trim());

      const models: {
        model_id: number;
        name: string;
        company_ref: number;
      }[] = [];

      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        if (parts.length >= 3) {
          models.push({
            model_id: parseInt(parts[0], 10),
            name: parts[1],
            company_ref: parseInt(parts[2], 10),
          });
        }
      }

      return NextResponse.json(models);
    } else {
      return NextResponse.json(
        { error: "Invalid type. Use 'companies' or 'models'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error loading lookup tables:", error);
    return NextResponse.json(
      { error: "Failed to load lookup tables" },
      { status: 500 }
    );
  }
}
