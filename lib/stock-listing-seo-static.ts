/**
 * Generate SEO title and meta description without AI.
 * Uses make, model, year + varied phrases about importing from Japan and www.zervtek.com.
 * Variety is achieved by hashing a seed (e.g. stockId + make + model) to pick different templates.
 */

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

export function generateStaticSeo(params: {
  stockId?: string | null
  brand?: string | null
  model?: string | null
  year?: number | null
}): { seoTitle: string; metaDescription: string } | null {
  const make = (params.brand || "Car").trim()
  const model = (params.model || "Model").trim()
  const year = params.year ?? new Date().getFullYear()
  const seed = `${params.stockId ?? ""}-${make}-${model}-${year}`
  const index = simpleHash(seed) % Math.min(TITLE_TEMPLATES.length, META_TEMPLATES.length)
  const titleFn = TITLE_TEMPLATES[index]!
  const metaFn = META_TEMPLATES[index]!
  return {
    seoTitle: titleFn(make, model, year).slice(0, 70),
    metaDescription: metaFn(make, model, year).slice(0, 160),
  }
}
