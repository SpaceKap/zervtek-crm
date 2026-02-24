import Redis from "ioredis";

let client: Redis | null = null;

/**
 * Get Redis client. Returns null if REDIS_URL is not set (e.g. local dev without Redis).
 * Client is a lazy singleton.
 */
export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  if (!client) {
    client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });
  }
  return client;
}

/**
 * Check if Redis is configured and available.
 */
export async function isRedisAvailable(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
