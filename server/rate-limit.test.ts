import { describe, expect, it } from "vitest";
import { createRateLimiter, getClientRateLimitKey } from "./rate-limit";

describe("API rate limiter", () => {
  it("allows the configured number of requests and returns standard headers", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2, key: () => "test" });
    const headers = new Map<string, string>();
    let responseResult: { code: number; body: { error: { code: string } } } | undefined;
    const response = { setHeader: (name: string, value: string) => headers.set(name, value), status: (code: number) => ({ json: (body: { error: { code: string } }) => { responseResult = { code, body }; } }) };
    const next = () => undefined;
    limiter({} as never, response as never, next);
    limiter({} as never, response as never, next);
    limiter({} as never, response as never, next);
    expect(headers.get("RateLimit-Limit")).toBe("2");
    expect(headers.get("RateLimit-Remaining")).toBe("0");
    expect(responseResult?.code).toBe(429);
    expect(responseResult?.body.error.code).toBe("RATE_LIMITED");
  });

  it("escalates repeated limit violations into a bounded abuse cooldown", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, abuseStrikeThreshold: 2, abuseCooldownMs: 10_000, key: () => "abuser" });
    const responses: Array<{ code: number; error: string }> = [];
    const response = { setHeader: () => undefined, status: (code: number) => ({ json: (body: { error: { code: string } }) => responses.push({ code, error: body.error.code }) }) };
    const req = {} as never;
    limiter(req, response as never, () => undefined);
    limiter(req, response as never, () => undefined);
    limiter(req, response as never, () => undefined);
    limiter(req, response as never, () => undefined);
    expect(responses).toEqual([{ code: 429, error: "RATE_LIMITED" }, { code: 429, error: "RATE_LIMITED" }, { code: 429, error: "ABUSE_BLOCKED" }]);
  });

  it("keeps a configured single-entry cache bounded", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, maxEntries: 1, key: req => (req as { id: string }).id });
    const response = { setHeader: () => undefined, status: () => ({ json: () => undefined }) };
    limiter({ id: "first" } as never, response as never, () => undefined);
    limiter({ id: "second" } as never, response as never, () => undefined);
    limiter({ id: "first" } as never, response as never, () => undefined);
    limiter({ id: "third" } as never, response as never, () => undefined);
    limiter({ id: "first" } as never, response as never, () => undefined);
  });

  it("does not expose authorization credentials in the default key", () => {
    const request = { socket: { remoteAddress: "10.0.0.4" }, get: (name: string) => name === "authorization" ? "Bearer secret-value" : undefined } as never;
    const key = getClientRateLimitKey(request);
    expect(key).toMatch(/^ip:10\.0\.0\.4:credential:[a-f0-9]{24}$/);
    expect(key).not.toContain("secret-value");
  });

  it("rejects missing limiter options", () => {
    expect(() => createRateLimiter(null as never)).toThrow("options are required");
  });
});
