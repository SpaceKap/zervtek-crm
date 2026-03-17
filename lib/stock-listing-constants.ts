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

export const TRANSMISSION_OPTIONS = ["AT", "FAT", "Manual", "CVT"]

export const DRIVE_OPTIONS = ["2WD", "4WD"]

export const COLOR_OPTIONS = [
  "Black",
  "White",
  "Silver",
  "Gray",
  "Red",
  "Blue",
  "Green",
  "Brown",
  "Beige",
  "Gold",
  "Yellow",
  "Orange",
  "Pearl White",
  "Other",
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

/** Auction score options (label only, no descriptions in UI) */
export const SCORE_OPTIONS = ["S/6", "5", "4.5", "4", "3.5", "RA", "3", "R", "2"]

/** Auto-deletion presets. "Never" = null (cron does not delete). */
export const AUTO_DELETE_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Never", value: null },
  { label: "14 Days", value: 14 },
  { label: "1 month", value: 30 },
  { label: "3 months", value: 90 },
  { label: "6 months", value: 180 },
  { label: "1 year", value: 365 },
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

const TITLE_TEMPLATES = [
  (make: string, model: string, year: number) =>
    `Import ${year} ${make} ${model} from Japan | ZervTek`,
]
const META_TEMPLATES = [
  (make: string, model: string, year: number) =>
    `Import ${year} ${make} ${model} from Japan. ZervTek – quality used cars from Japan.`,
  (make: string, model: string, year: number) =>
    `Source your ${year} ${make} ${model} from Japan. ZervTek simplifies the import process.`,
  (make: string, model: string, year: number) =>
    `${make} ${model} ${year} available for export. Trust ZervTek for Japanese used car imports.`,
]

function simpleHash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/** Client-side static SEO. Title uses UPPERCASE make/model; meta description uses normal casing. */
export function generateStaticSeoClient(params: {
  brand?: string | null
  model?: string | null
  year?: number | null
  seed?: string
}): { seoTitle: string; metaDescription: string } | null {
  const makeUpper = (params.brand || "Car").trim().toUpperCase()
  const modelUpper = (params.model || "Model").trim().toUpperCase()
  const makeMeta = (params.brand || "Car").trim()
  const modelMeta = (params.model || "Model").trim()
  const year = params.year ?? CURRENT_YEAR
  const seed = `${params.seed ?? ""}-${makeUpper}-${modelUpper}-${year}`
  const index = simpleHash(seed) % Math.min(TITLE_TEMPLATES.length, META_TEMPLATES.length)
  const titleFn = TITLE_TEMPLATES[index]!
  const metaFn = META_TEMPLATES[index]!
  return {
    seoTitle: titleFn(makeUpper, modelUpper, year).slice(0, 70),
    metaDescription: metaFn(makeMeta, modelMeta, year).slice(0, 160),
  }
}
