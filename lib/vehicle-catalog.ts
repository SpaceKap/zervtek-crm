import fs from "fs";
import path from "path";

interface VehicleCatalogEntry {
  id: string;
  modelId: string;
  companyId: string; // Make ID
  companyName: string; // Make name (e.g., "CADILLAC")
  modelName: string; // Model name (e.g., "ATS")
  modelDate: string; // Format: YYYYMM
  totalLWH: string; // Format: "L*W*H" in mm
}

let catalogCache: VehicleCatalogEntry[] | null = null;

/**
 * Parse TOTAL_LWH string (e.g., "4680*1805*1415") and calculate volume in m³
 */
export function calculateVolumeFromLWH(lwhString: string): number {
  if (!lwhString || !lwhString.includes("*")) {
    return 0;
  }

  const parts = lwhString.split("*").map((p) => parseFloat(p.trim()));
  if (parts.length !== 3 || parts.some((p) => isNaN(p))) {
    return 0;
  }

  // Convert mm to m and calculate volume
  const length = parts[0] / 1000; // mm to m
  const width = parts[1] / 1000; // mm to m
  const height = parts[2] / 1000; // mm to m

  return length * width * height; // m³
}

/**
 * Extract year from MODEL_DATE (format: YYYYMM)
 */
function extractYear(modelDate: string): number {
  if (!modelDate || modelDate.length < 4) {
    return 0;
  }
  return parseInt(modelDate.substring(0, 4), 10);
}

/**
 * Load and parse the vehicle catalog CSV
 */
async function loadCatalog(): Promise<VehicleCatalogEntry[]> {
  if (catalogCache) {
    return catalogCache;
  }

  try {
    // CSV file is in the data folder at the project root
    const csvPath = path.join(
      process.cwd(),
      "data",
      "catalog_base_202601301645.csv"
    );
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const lines = csvContent.split("\n");

    if (lines.length < 2) {
      console.error("CSV file is empty or invalid");
      return [];
    }

    // Parse header
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

    const modelIdIndex = headers.indexOf("MODEL_ID");
    const companyIdIndex = headers.indexOf("COMPANY_ID");
    const companyNameIndex = headers.indexOf("COMPANY");
    const modelNameIndex = headers.indexOf("MODEL_NAME");
    const modelDateIndex = headers.indexOf("MODEL_DATE");
    const totalLWHIndex = headers.indexOf("TOTAL_LWH");

    if (
      modelIdIndex === -1 ||
      companyIdIndex === -1 ||
      modelDateIndex === -1 ||
      totalLWHIndex === -1
    ) {
      console.error("Required columns not found in CSV");
      return [];
    }

    const entries: VehicleCatalogEntry[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle CSV parsing (accounting for quoted fields)
      const values: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const modelId = values[modelIdIndex]?.replace(/^"|"$/g, "") || "";
      const companyId = values[companyIdIndex]?.replace(/^"|"$/g, "") || "";
      const companyName =
        companyNameIndex !== -1
          ? (values[companyNameIndex]?.replace(/^"|"$/g, "") || "").toUpperCase()
          : "";
      const modelName =
        modelNameIndex !== -1
          ? (values[modelNameIndex]?.replace(/^"|"$/g, "") || "").toUpperCase()
          : "";
      const modelDate = values[modelDateIndex]?.replace(/^"|"$/g, "") || "";
      const totalLWH = values[totalLWHIndex]?.replace(/^"|"$/g, "") || "";

      if (modelId && companyId && modelDate && totalLWH) {
        entries.push({
          id: `${companyId}-${modelId}-${modelDate}`,
          modelId,
          companyId,
          companyName,
          modelName,
          modelDate,
          totalLWH,
        });
      }
    }

    catalogCache = entries;
    return entries;
  } catch (error) {
    console.error("Error loading vehicle catalog:", error);
    return [];
  }
}

/**
 * Find vehicle dimensions from catalog based on make ID, model ID, and year
 * Returns the closest match by year
 */
export async function getVehicleDimensions(
  makeId: string,
  modelId: string,
  year: number
): Promise<{ volume: number; lwh: string | null }> {
  const catalog = await loadCatalog();

  if (!catalog.length) {
    return { volume: 0, lwh: null };
  }

  // Find all matching entries for this make and model
  const matches = catalog.filter(
    (entry) =>
      entry.companyId === makeId && entry.modelId === modelId
  );

  if (!matches.length) {
    return { volume: 0, lwh: null };
  }

  // Find the closest match by year
  let closest = matches[0];
  let minYearDiff = Math.abs(extractYear(closest.modelDate) - year);

  for (const match of matches) {
    const yearDiff = Math.abs(extractYear(match.modelDate) - year);
    if (yearDiff < minYearDiff) {
      minYearDiff = yearDiff;
      closest = match;
    }
  }

  const volume = calculateVolumeFromLWH(closest.totalLWH);
  return { volume, lwh: closest.totalLWH };
}

/**
 * Find vehicle dimensions from catalog based on make name, model name, and year
 * Returns the closest match by year (fuzzy matching by name)
 */
export async function getVehicleDimensionsByName(
  makeName: string,
  modelName: string,
  year: number
): Promise<{ volume: number; lwh: string | null }> {
  const catalog = await loadCatalog();

  if (!catalog.length || !makeName || !modelName) {
    return { volume: 0, lwh: null };
  }

  const makeUpper = makeName.toUpperCase().trim();
  const modelUpper = modelName.toUpperCase().trim();

  // Find all matching entries for this make and model (fuzzy match)
  const matches = catalog.filter((entry) => {
    const companyMatch =
      entry.companyName.includes(makeUpper) ||
      makeUpper.includes(entry.companyName);
    const modelMatch =
      entry.modelName.includes(modelUpper) ||
      modelUpper.includes(entry.modelName);
    return companyMatch && modelMatch;
  });

  if (!matches.length) {
    return { volume: 0, lwh: null };
  }

  // Find the closest match by year
  let closest = matches[0];
  let minYearDiff = Math.abs(extractYear(closest.modelDate) - year);

  for (const match of matches) {
    const yearDiff = Math.abs(extractYear(match.modelDate) - year);
    if (yearDiff < minYearDiff) {
      minYearDiff = yearDiff;
      closest = match;
    }
  }

  const volume = calculateVolumeFromLWH(closest.totalLWH);
  return { volume, lwh: closest.totalLWH };
}
