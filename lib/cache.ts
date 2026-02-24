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
