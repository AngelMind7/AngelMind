import { describe, expect, it } from "vitest";
import { buildUsageInvoicePreview } from "./usage-billing-contract";

const event = { id: "run-1", workspaceId: 7, category: "ai_run" as const, quantity: 2, unitPriceCents: 15, occurredAt: "2026-09-10T10:00:00.000Z" };

describe("self-contained usage billing contract", () => {
  it("builds deterministic invoice previews with quota state", () => {
    const input = { workspaceId: 7, periodStart: "2026-09-01T00:00:00.000Z", periodEnd: "2026-10-01T00:00:00.000Z", quotaCents: 30, events: [event] };
    const first = buildUsageInvoicePreview(input);
    const second = buildUsageInvoicePreview(input);
    expect(first).toMatchObject({ subtotalCents: 30, withinQuota: true, payment: "disabled_external_provider" });
    expect(first.evidenceHash).toBe(second.evidenceHash);
  });

  it("reports quota exceeded without charging or dispatching payment", () => {
    const result = buildUsageInvoicePreview({ workspaceId: 7, periodStart: "2026-09-01T00:00:00.000Z", periodEnd: "2026-10-01T00:00:00.000Z", quotaCents: 10, events: [event] });
    expect(result.withinQuota).toBe(false);
    expect(result.payment).toBe("disabled_external_provider");
  });

  it("rejects duplicates and events outside the period", () => {
    const base = { workspaceId: 7, periodStart: "2026-09-01T00:00:00.000Z", periodEnd: "2026-10-01T00:00:00.000Z", quotaCents: 100 };
    expect(() => buildUsageInvoicePreview({ ...base, events: [event, event] })).toThrow(/Duplicate/);
    expect(() => buildUsageInvoicePreview({ ...base, events: [{ ...event, occurredAt: "2026-11-01T00:00:00.000Z" }] })).toThrow(/outside/);
  });
});
