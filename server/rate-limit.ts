import type { NextFunction, Request, RequestHandler, Response } from "express";

export type RateLimitOptions = { windowMs: number; max: number; maxEntries?: number; key?: (req: Request) => string };
type Bucket = { count: number; resetAt: number };

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const windowMs = Math.max(1_000, Math.trunc(options.windowMs));
  const max = Math.max(1, Math.trunc(options.max));
  const maxEntries = Math.max(100, Math.trunc(options.maxEntries ?? 10_000));
  const keyFor = options.key ?? ((req: Request) => req.ip || req.socket.remoteAddress || "unknown");
  const buckets = new Map<string, Bucket>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = keyFor(req).slice(0, 256);
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    bucket.count += 1;
    buckets.set(key, bucket);
    if (buckets.size > maxEntries) {
      buckets.forEach((value, bucketKey) => {
        if (value.resetAt <= now || buckets.size > maxEntries) buckets.delete(bucketKey);
      });
    }
    const remaining = Math.max(0, max - bucket.count);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1_000)));
    if (bucket.count > max) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000))));
      res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests; retry after the rate-limit window." }, apiVersion: "v1" });
      return;
    }
    next();
  };
}

export function registerApiRateLimit(app: { use: (path: string, handler: RequestHandler) => void }, options?: Partial<RateLimitOptions>) {
  const windowMs = Number(process.env.API_RATE_LIMIT_WINDOW_MS ?? options?.windowMs ?? 60_000);
  const max = Number(process.env.API_RATE_LIMIT_MAX ?? options?.max ?? 120);
  app.use("/api/v1", createRateLimiter({ windowMs, max, maxEntries: options?.maxEntries ?? 20_000 }));
  app.use("/api/trpc", createRateLimiter({ windowMs, max: Math.max(30, Math.floor(max / 2)), maxEntries: options?.maxEntries ?? 20_000 }));
}
