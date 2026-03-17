/**
 * CORS for stock-listings API so www.zervtek.com (and other allowed origins) can call
 * crm.zervtek.com/api/stock-listings from the browser.
 *
 * Set CORS_ALLOWED_ORIGINS in .env (comma-separated) to override defaults.
 * Example: CORS_ALLOWED_ORIGINS=https://www.zervtek.com,https://zervtek.com,http://localhost:3000
 */

const DEFAULT_ORIGINS = [
  "https://www.zervtek.com",
  "https://zervtek.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]

function getAllowedOrigins(): string[] {
  const env = process.env.CORS_ALLOWED_ORIGINS
  if (env && env.trim()) {
    return env.split(",").map((o) => o.trim()).filter(Boolean)
  }
  return DEFAULT_ORIGINS
}

/** Returns the request Origin if it is allowed, otherwise null. */
export function getAllowedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin")
  if (!origin) return null
  const allowed = getAllowedOrigins()
  return allowed.includes(origin) ? origin : null
}

/** CORS headers to add to a response for stock-listings API. */
export function stockListingsCorsHeaders(request: Request): Record<string, string> {
  const origin = getAllowedOrigin(request)
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  }
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin
  }
  return headers
}
