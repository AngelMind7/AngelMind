import { createHash } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";

export type RateLimitOptions = {
  windowMs: number;
  max: number;
  maxEntries?: number;
  key?: (req: Request) => string;
  abuseStrikeThreshold?: number;
  abuseCooldownMs?: number;
};
type Bucket = { count: number; resetAt: number };
type AbuseState = { strikes: number; blockedUntil: number };

function boundedNumber(value: number, fallback: number, minimum: number, maximum: number) {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, Math.trunc(value))) : fallback;
}

/**
 * Uses the socket address unless the deployment explicitly opts into a trusted proxy.
 * Authorization material is hashed before it participates in a rate-limit key.
 */
export function getClientRateLimitKey(req: Request) {
  const remoteAddress = req.socket.remoteAddress || "unknown";
  const forwarded = process.env.TRUST_PROXY === "true" ? req.get("x-forwarded-for")?.split(",")[0]?.trim() : undefined;
  const address = (forwarded || remoteAddress).slice(0, 128);
  const authorization = req.get("authorization")?.trim();
  if (!authorization) return `ip:${address}`;
  const credentialDigest = createHash("sha256").update(authorization).digest("hex").slice(0, 24);
  return `ip:${address}:credential:${credentialDigest}`;
}

function evictExpired<T extends { resetAt?: number; blockedUntil?: number }>(map: Map<string, T>, now: number, maxEntries: number) {
  map.forEach((value, key) => {
    const bucketExpired = value.resetAt !== undefined && value.resetAt <= now;
    const abuseExpired = value.blockedUntil !== undefined && value.blockedUntil <= now;
    if (bucketExpired || abuseExpired) map.delete(key);
  });
  while (map.size > maxEntries) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
}

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const windowMs = boundedNumber(options.windowMs, 60_000, 1_000, 86_400_000);
  const max = boundedNumber(options.max, 120, 1, 100_000);
  const maxEntries = boundedNumber(options.maxEntries ?? 10_000, 10_000, 1, 100_000);
  const strikeThreshold = boundedNumber(options.abuseStrikeThreshold ?? 5, 5, 1, 100);
  const cooldownMs = boundedNumber(options.abuseCooldownMs ?? Math.min(windowMs * 4, 3_600_000), windowMs, 1_000, 86_400_000);
  const keyFor = options.key ?? getClientRateLimitKey;
  const buckets = new Map<string, Bucket>();
  const abuse = new Map<string, AbuseState>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = String(keyFor(req) || "unknown").slice(0, 256);
    const state = abuse.get(key);
    if (state && state.blockedUntil > now) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((state.blockedUntil - now) / 1_000))));
      res.status(429).json({ error: { code: "ABUSE_BLOCKED", message: "Request temporarily blocked; retry after the abuse cooldown." }, apiVersion: "v1" });
      return;
    }

    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    bucket.count += 1;
    buckets.set(key, bucket);
    evictExpired(buckets, now, maxEntries);
    evictExpired(abuse, now, maxEntries);

    const remaining = Math.max(0, max - bucket.count);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1_000)));
    res.setHeader("RateLimit-Policy", `${max};w=${Math.ceil(windowMs / 1_000)}`);
    if (bucket.count > max) {
      const nextState = state ?? { strikes: 0, blockedUntil: 0 };
      nextState.strikes += 1;
      if (nextState.strikes >= strikeThreshold) nextState.blockedUntil = now + Math.min(cooldownMs * 2 ** Math.min(nextState.strikes - strikeThreshold, 4), 86_400_000);
      abuse.set(key, nextState);
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil(((nextState.blockedUntil || bucket.resetAt) - now) / 1_000))));
      res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests; retry after the rate-limit window." }, apiVersion: "v1" });
      return;
    }
    next();
  };
}

export function registerApiRateLimit(app: { use: (path: string, handler: RequestHandler) => void }, options?: Partial<RateLimitOptions>) {
  const windowMs = Number(process.env.API_RATE_LIMIT_WINDOW_MS ?? options?.windowMs ?? 60_000);
  const max = Number(process.env.API_RATE_LIMIT_MAX ?? options?.max ?? 120);
  const maxEntries = options?.maxEntries ?? 20_000;
  app.use("/api/auth/firebase", createRateLimiter({ windowMs, max: Math.min(max, 10), maxEntries, abuseStrikeThreshold: 3 }));
  app.use("/api/scheduled", createRateLimiter({ windowMs, max: Math.min(max, 30), maxEntries, abuseStrikeThreshold: 3 }));
  app.use("/api/v1", createRateLimiter({ windowMs, max, maxEntries }));
  app.use("/api/trpc", createRateLimiter({ windowMs, max: Math.max(30, Math.floor(max / 2)), maxEntries }));
}
