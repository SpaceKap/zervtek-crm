type StockListingSpecs = {
  stockId: string
  status?: string
  fobPrice?: string | number
  brand?: string
  model?: string
  grade?: string
  year?: number
  mileage?: number
  transmission?: string
  extColor?: string
  fuel?: string
  drive?: string
  doors?: number
  engine?: string
  score?: string
  equipment?: string
}

/**
 * Generate SEO title, meta description, and body description using OpenAI from vehicle specs.
 * Returns null if OPENAI_API_KEY is missing or the request fails.
 */
export async function generateStockListingSeo(specs: StockListingSpecs): Promise<{
  seoTitle: string
  metaDescription: string
  description: string
} | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    console.warn("OPENAI_API_KEY not set, skipping SEO generation")
    return null
  }

  const parts = [
    specs.stockId && `Stock ID: ${specs.stockId}`,
    specs.status && `Status: ${specs.status}`,
    specs.fobPrice != null && `FOB Price: ¥${specs.fobPrice}`,
    specs.brand && `Brand: ${specs.brand}`,
    specs.model && `Model: ${specs.model}`,
    specs.grade && `Grade: ${specs.grade}`,
    specs.year && `Year: ${specs.year}`,
    specs.mileage != null && `Mileage: ${specs.mileage} km`,
    specs.transmission && `Transmission: ${specs.transmission}`,
    specs.extColor && `Exterior: ${specs.extColor}`,
    specs.fuel && `Fuel: ${specs.fuel}`,
    specs.drive && `Drive: ${specs.drive}`,
    specs.doors != null && `Doors: ${specs.doors}`,
    specs.engine && `Engine: ${specs.engine}`,
    specs.score && `Score: ${specs.score}`,
    specs.equipment && `Equipment: ${specs.equipment}`,
  ].filter(Boolean)

  const specText = parts.join("\n")

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an SEO copywriter for a used car export website. Given vehicle specifications, output exactly three short texts:
1. seoTitle: A single line, under 60 characters, for the page title (e.g. "2009 Honda Fit G - Stock 972596870 | ZervTek").
2. metaDescription: A single line, under 160 characters, for the meta description (sales-focused, include key specs and price).
3. description: A 2-4 sentence paragraph for the page body describing the vehicle and its condition, suitable for buyers.`,
          },
          {
            role: "user",
            content: specText,
          },
        ],
        response_format: { type: "json_object" },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.warn("OpenAI SEO request failed:", res.status, err)
      return null
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content) as {
      seoTitle?: string
      metaDescription?: string
      description?: string
    }
    return {
      seoTitle: String(parsed.seoTitle ?? "").slice(0, 200),
      metaDescription: String(parsed.metaDescription ?? "").slice(0, 300),
      description: String(parsed.description ?? "").slice(0, 2000),
    }
  } catch (err) {
    console.warn("OpenAI SEO generation error:", err)
    return null
  }
}
