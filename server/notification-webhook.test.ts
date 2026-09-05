import { describe, expect, it } from "vitest";
import { prepareSignedWebhookRequest } from "./notification-delivery";

describe("signed webhook request safety", () => {
  it("signs a canonical timestamped payload", () => {
    const result = prepareSignedWebhookRequest("https://hooks.example.test/events", "secret", { event: "finding.created" }, 1_700_000_000);
    expect(result.url).toBe("https://hooks.example.test/events");
    expect(result.headers["x-angelmind-timestamp"]).toBe("1700000000");
    expect(result.headers["x-angelmind-signature"]).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(JSON.parse(result.body)).toEqual({ event: "finding.created" });
  });

  it("rejects insecure and private endpoints", () => {
    expect(() => prepareSignedWebhookRequest("http://hooks.example.test", "secret", {})).toThrow(/HTTPS/);
    expect(() => prepareSignedWebhookRequest("https://127.0.0.1/events", "secret", {})).toThrow(/safety policy/);
    expect(() => prepareSignedWebhookRequest("https://service.internal/events", "secret", {})).toThrow(/safety policy/);
    expect(() => prepareSignedWebhookRequest("https://user:pass@hooks.example.test/events", "secret", {})).toThrow(/safety policy/);
  });
});
