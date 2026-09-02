import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

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
});
