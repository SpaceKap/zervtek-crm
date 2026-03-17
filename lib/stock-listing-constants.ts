const CURRENT_YEAR = 2026

/** Years for dropdown: 2026 down to 1989 */
export const STOCK_LISTING_YEARS = Array.from(
  { length: CURRENT_YEAR - 1989 + 1 },
  (_, i) => CURRENT_YEAR - i
)

export const FUEL_OPTIONS = [
  "Petrol",
  "Diesel",
  "Hybrid",
  "Electric",
  "LPG",
  "Plug-in Hybrid",
  "Mild Hybrid",
]

export const TRANSMISSION_OPTIONS = [
  "Automatic",
  "Manual",
  "CVT",
  "Semi-Auto",
  "DCT",
  "Dual Clutch",
  "Single Speed",
]

export const DRIVE_OPTIONS = [
  "FWD",
  "RWD",
  "AWD",
  "4WD",
  "2WD",
]

export const EQUIPMENT_OPTIONS = [
  "Sunroof",
  "Alloy Wheels",
  "Power Steering",
  "Power Windows",
  "Airbag",
  "Leather Seats",
  "Turbo",
]

/** Format number with commas (e.g. 1234567 -> "1,234,567") */
export function formatNumberWithCommas(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return ""
  const n = typeof value === "string" ? parseInt(value.replace(/,/g, ""), 10) : Number(value)
  if (Number.isNaN(n)) return ""
  return n.toLocaleString("en-US")
}

/** Parse input string with commas to number (e.g. "1,234,567" -> 1234567) */
export function parseFormattedNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const cleaned = String(value).replace(/,/g, "").trim()
  if (cleaned === "") return null
  const n = parseInt(cleaned, 10)
  return Number.isNaN(n) ? null : n
}

const SITE = "www.zervtek.com"
const TITLE_TEMPLATES = [
  (make: string, model: string, year: number) =>
    `${year} ${make} ${model} | Import from Japan | ${SITE}`,
  (make: string, model: string, year: number) =>
    `${make} ${model} ${year} - Japanese Used Cars | Zervtek`,
  (make: string, model: string, year: number) =>
    `${year} ${make} ${model} - Source from Japan | ${SITE}`,
  (make: string, model: string, year: number) =>
    `Buy ${year} ${make} ${model} from Japan | ${SITE}`,
  (make: string, model: string, year: number) =>
    `${make} ${model} (${year}) | Japan Export | Zervtek`,
  (make: string, model: string, year: number) =>
    `${year} ${make} ${model} | Reliable Japan Imports | ${SITE}`,
]
const META_TEMPLATES = [
  (make: string, model: string, year: number) =>
    `${year} ${make} ${model}. Import directly from Japan with Zervtek. Quality used cars at competitive prices. Visit ${SITE} for more stock.`,
  (make: string, model: string, year: number) =>
    `Source your ${year} ${make} ${model} from Japan. Zervtek simplifies the import process. Browse our inventory at ${SITE}.`,
  (make: string, model: string, year: number) =>
    `${make} ${model} ${year} available for export. Trust Zervtek for Japanese used car imports. ${SITE}`,
  (make: string, model: string, year: number) =>
    `Import ${year} ${make} ${model} from Japan. Transparent pricing, verified vehicles. ${SITE}`,
  (make: string, model: string, year: number) =>
    `${year} ${make} ${model} - Japanese used car export. Zervtek connects you with quality stock. Visit ${SITE}.`,
  (make: string, model: string, year: number) =>
    `Buy ${make} ${model} (${year}) from Japan. Easy import process with Zervtek. ${SITE}`,
]

function simpleHash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/** Client-side static SEO for preview/fill. Uses make, model, year with variety. */
export function generateStaticSeoClient(params: {
  brand?: string | null
  model?: string | null
  year?: number | null
  seed?: string
}): { seoTitle: string; metaDescription: string } | null {
  const make = (params.brand || "Car").trim()
  const model = (params.model || "Model").trim()
  const year = params.year ?? CURRENT_YEAR
  const seed = `${params.seed ?? ""}-${make}-${model}-${year}`
  const index = simpleHash(seed) % Math.min(TITLE_TEMPLATES.length, META_TEMPLATES.length)
  const titleFn = TITLE_TEMPLATES[index]!
  const metaFn = META_TEMPLATES[index]!
  return {
    seoTitle: titleFn(make, model, year).slice(0, 70),
    metaDescription: metaFn(make, model, year).slice(0, 160),
  }
}
