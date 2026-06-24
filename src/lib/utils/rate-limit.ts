import { redis } from "@/lib/cache";
import type { NextRequest } from "next/server";
import { apiError } from "./api";

interface RateLimitOptions {
  max: number;
  windowMs: number;
  identifier?: (req: NextRequest) => string;
}

export async function rateLimit(
  req: NextRequest,
  options: RateLimitOptions = { max: 100, windowMs: 60000 }
): Promise<{ success: boolean; remaining: number; reset: number } | null> {
  const identifier =
    options.identifier?.(req) ||
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "anonymous";

  const key = `rate:${req.nextUrl.pathname}:${identifier}`;
  const windowSec = Math.ceil(options.windowMs / 1000);

  const pipe = redis.pipeline();
  pipe.incr(key);
  pipe.expire(key, windowSec);
  const results = await pipe.exec();

  const count = (results?.[0]?.[1] as number) || 1;
  const remaining = Math.max(0, options.max - count);
  const reset = Math.ceil(Date.now() / 1000) + windowSec;

  return { success: count <= options.max, remaining, reset };
}

export function withRateLimit(
  handler: (req: NextRequest, ctx: unknown) => Promise<Response>,
  options?: RateLimitOptions
) {
  return async (req: NextRequest, ctx: unknown): Promise<Response> => {
    const result = await rateLimit(req, options);
    if (result && !result.success) {
      return apiError("Too many requests", 429);
    }
    return handler(req, ctx);
  };
}
