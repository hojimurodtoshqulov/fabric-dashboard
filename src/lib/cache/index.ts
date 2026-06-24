import Redis from "ioredis";
import { config } from "@/config";

const globalForRedis = globalThis as unknown as { redis: Redis | null };

function createRedisClient(): Redis | null {
  if (!config.redis.url || config.redis.url === "redis://localhost:6379") {
    // Try to connect but don't crash if unavailable
  }
  try {
    const client = new Redis(config.redis.url, {
      password: config.redis.password || undefined,
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) return null; // stop retrying
        return Math.min(times * 200, 1000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    client.on("error", () => {}); // silent errors in dev
    return client;
  } catch {
    return null;
  }
}

export const redis: Redis =
  (globalForRedis.redis as Redis) || (createRedisClient() as Redis);

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// Cache helpers — gracefully no-op if Redis unavailable
export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  if (!redis) return;
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {}
}

export async function deleteCache(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {}
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch {}
}

export const CACHE_KEYS = {
  clients: (page: number, filter: string) => `clients:${page}:${filter}`,
  client: (id: string) => `client:${id}`,
  invoices: (clientId?: string) => `invoices:${clientId || "all"}`,
  analytics: (type: string, period: string) => `analytics:${type}:${period}`,
  settings: () => "settings:all",
  permissions: (userId: string) => `permissions:${userId}`,
};
