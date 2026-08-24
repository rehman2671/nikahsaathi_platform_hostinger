import type { NextFunction, Request, Response } from "express";
import { consumeSharedRateLimit } from "../db";
import { ENV } from "./env";

type Bucket = { startedAt: number; count: number };
type RateLimitOptions = { windowMs: number; max: number; keyPrefix: string };

export function createRateLimiter(options: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();
  return async (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${options.keyPrefix}:${request.ip || request.socket.remoteAddress || "unknown"}`;
    let shared: Awaited<ReturnType<typeof consumeSharedRateLimit>> = null;
    if (ENV.sharedRateLimitEnabled) {
      try {
        shared = await consumeSharedRateLimit({ bucketKey: key, windowMs: options.windowMs, max: options.max });
      } catch (error) {
        console.warn("[RateLimit] Shared ledger unavailable; using local fallback", error);
      }
    }

    const localCount = () => {
      const current = buckets.get(key);
      const bucket = !current || now - current.startedAt >= options.windowMs ? { startedAt: now, count: 0 } : current;
      bucket.count += 1;
      buckets.set(key, bucket);
      if (buckets.size > 10_000) {
        buckets.forEach((item, bucketKey) => {
          if (now - item.startedAt >= options.windowMs) buckets.delete(bucketKey);
        });
      }
      return bucket;
    };
    const local = shared ? null : localCount();
    const count = shared?.count ?? local?.count ?? 0;
    const allowed = shared?.allowed ?? count <= options.max;
    response.setHeader("X-RateLimit-Limit", String(options.max));
    response.setHeader("X-RateLimit-Remaining", String(Math.max(0, options.max - count)));
    if (!allowed) {
      const retryAfter = shared?.retryAfterSeconds ?? Math.max(1, Math.ceil((options.windowMs - (now - (local?.startedAt ?? now))) / 1000));
      response.setHeader("Retry-After", String(retryAfter));
      return response.status(429).json({ error: "Too many requests", retryAfter });
    }
    return next();
  };
}
