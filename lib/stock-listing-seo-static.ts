/**
 * Generate SEO title and meta description without AI.
 * Title format: Import {year} {MAKE} {MODEL} from Japan | ZervTek. No www.zervtek.com in title or description.
 */

const TITLE_TEMPLATES = [
  (make: string, model: string, year: number) =>
    `Import ${year} ${make} ${model} from Japan | ZervTek`,
  (make: string, model: string, year: number) =>
    `Import ${year} ${make} ${model} from Japan | ZervTek`,
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

export function generateStaticSeo(params: {
  stockId?: string | null
  brand?: string | null
  model?: string | null
  year?: number | null
}): { seoTitle: string; metaDescription: string } | null {
  const makeUpper = (params.brand || "Car").trim().toUpperCase()
  const modelUpper = (params.model || "Model").trim().toUpperCase()
  const makeMeta = (params.brand || "Car").trim()
  const modelMeta = (params.model || "Model").trim()
  const year = params.year ?? new Date().getFullYear()
  const seed = `${params.stockId ?? ""}-${makeUpper}-${modelUpper}-${year}`
  const index = simpleHash(seed) % Math.min(TITLE_TEMPLATES.length, META_TEMPLATES.length)
  const titleFn = TITLE_TEMPLATES[index]!
  const metaFn = META_TEMPLATES[index]!
  return {
    seoTitle: titleFn(makeUpper, modelUpper, year).slice(0, 70),
    metaDescription: metaFn(makeMeta, modelMeta, year).slice(0, 160),
  }
}
