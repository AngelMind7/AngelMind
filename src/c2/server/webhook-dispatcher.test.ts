import { describe, expect, it, vi } from "vitest";
import { dispatchWebhook, webhookRetryDelayMs } from "./webhook-dispatcher";

const base = {
  endpoint: "https://hooks.example.test/angelmind",
  signingSecretReference: "secret://workspace-1/webhook-main",
  eventTypes: JSON.stringify(["finding_validated"]),
  endpointConfirmed: 1,
  enabled: 1,
};

describe("governed webhook dispatcher", () => {
  it("fails closed before activation or secret resolution", async () => {
    const result = await dispatchWebhook({ eventType: "finding_validated", payload: {}, configuration: { ...base, enabled: 0 }, resolveSecret: vi.fn() });
    expect(result).toEqual({ delivered: false, reason: "webhook-activation-required" });
  });

  it("filters unsubscribed events without making an outbound request", async () => {
    const fetchImpl = vi.fn();
    const result = await dispatchWebhook({ eventType: "incident_created", payload: {}, configuration: base, resolveSecret: async () => "secret", fetchImpl });
    expect(result.reason).toBe("event-not-subscribed");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("signs an approved request and reports HTTP failures", async () => {
    const fetchImpl = vi.fn(async () => new Response("bad", { status: 503 }));
    const result = await dispatchWebhook({ eventType: "finding_validated", payload: { findingId: 7 }, configuration: base, resolveSecret: async () => "secret", fetchImpl });
    expect(result).toEqual({ delivered: false, statusCode: 503, reason: "webhook-http-503" });
    expect(fetchImpl).toHaveBeenCalledWith(base.endpoint, expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "x-angelmind-signature": expect.stringMatching(/^sha256=/) }) }));
  });

  it("uses bounded exponential retry delay", () => {
    expect(webhookRetryDelayMs(0)).toBe(5_000);
    expect(webhookRetryDelayMs(20)).toBe(3_600_000);
  });
});
