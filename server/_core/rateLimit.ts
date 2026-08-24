import type { NextFunction, Request, Response } from "express";

type Bucket = { startedAt: number; count: number };
type RateLimitOptions = { windowMs: number; max: number; keyPrefix: string };

export function createRateLimiter(options: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();
  return (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${options.keyPrefix}:${request.ip || request.socket.remoteAddress || "unknown"}`;
    const current = buckets.get(key);
    const bucket = !current || now - current.startedAt >= options.windowMs ? { startedAt: now, count: 0 } : current;
    bucket.count += 1;
    buckets.set(key, bucket);
    if (buckets.size > 10_000) {
      buckets.forEach((item, bucketKey) => {
        if (now - item.startedAt >= options.windowMs) buckets.delete(bucketKey);
      });
    }
    const remaining = Math.max(0, options.max - bucket.count);
    response.setHeader("X-RateLimit-Limit", String(options.max));
    response.setHeader("X-RateLimit-Remaining", String(remaining));
    if (bucket.count > options.max) {
      const retryAfter = Math.max(1, Math.ceil((options.windowMs - (now - bucket.startedAt)) / 1000));
      response.setHeader("Retry-After", String(retryAfter));
      return response.status(429).json({ error: "Too many requests", retryAfter });
    }
    return next();
  };
}
