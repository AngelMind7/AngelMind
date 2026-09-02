import { describe, expect, it } from "vitest";
import { assertSafeWebhookEndpoint, normalizeWebhookEvents } from "./webhook-policy";

describe("webhook draft policy", () => {
  it("requires public HTTPS endpoints and at least one allowed event", () => {
    expect(assertSafeWebhookEndpoint("https://hooks.example.com/angelmind").hostname).toBe("hooks.example.com");
    expect(() => assertSafeWebhookEndpoint("http://hooks.example.com")).toThrow("HTTPS");
    expect(() => assertSafeWebhookEndpoint("https://127.0.0.1/events")).toThrow("local or private");
    expect(() => assertSafeWebhookEndpoint("https://[::1]/events")).toThrow("local or private");
    expect(() => assertSafeWebhookEndpoint("https://[fc00::1]/events")).toThrow("local or private");
    expect(() => assertSafeWebhookEndpoint("https://hooks.example.com:8443/events")).toThrow("default HTTPS port");
    expect(normalizeWebhookEvents(["guardrail_blocked", "guardrail_blocked"])).toEqual(["guardrail_blocked"]);
  });
});
