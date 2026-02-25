import { getRedis } from "./redis";

const DEFAULT_TTL_SECONDS = 300; // 5 minutes

/**
 * Get a value from cache or compute and store it. Returns the fetcher result either way.
 * If Redis is not configured, always calls fetcher and does not cache.
 * @param onlyCacheIf - If provided, only cache when this returns true (e.g. skip caching error-like results).
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
  onlyCacheIf?: (value: T) => boolean
): Promise<T> {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(key);
      if (raw != null) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // Fall through to fetcher
    }
  }
  const data = await fetcher();
  const shouldCache = onlyCacheIf == null || onlyCacheIf(data);
  if (redis && shouldCache) {
    try {
      await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
    } catch {
      // Ignore cache write errors
    }
  }
  return data;
}

/**
 * Invalidate a cache key (e.g. after update/delete).
 */
export async function invalidateCache(key: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(key);
    } catch {
      // Ignore
    }
  }
}

/**
 * Invalidate all keys matching a prefix (e.g. "customers:list:" to clear all customer list caches).
 * Uses SCAN to avoid blocking.
 */
export async function invalidateCachePattern(prefix: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const keys: string[] = [];
    let cursor = "0";
    do {
      const [nextCursor, found] = await redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
      cursor = nextCursor;
      keys.push(...found);
    } while (cursor !== "0");
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // Ignore
  }
}

/** Build a stable cache key suffix from URL search params (sorted). */
export function cacheKeyFromSearchParams(searchParams: URLSearchParams): string {
  const entries = Array.from(searchParams.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  if (entries.length === 0) return "default";
  return entries.map(([k, v]) => `${k}=${v}`).join("&");
}

/**
 * Rate limit by key (e.g. IP). Returns true if under limit, false if over.
 * Uses Redis INCR + EXPIRE. Window is 1 minute, max 20 requests per key.
 * If Redis is not configured, falls back to allowing the request (no rate limit).
 */
export async function checkRateLimit(
  key: string,
  windowSeconds: number = 60,
  maxRequests: number = 20
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  const redisKey = `ratelimit:${key}`;
  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }
    return count <= maxRequests;
  } catch {
    return true; // On Redis error, allow request
  }
}
