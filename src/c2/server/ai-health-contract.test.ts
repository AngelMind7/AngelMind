import { describe, expect, it } from "vitest";
import { chooseHealthFallback, evaluateModelHealth } from "./ai-health-contract";

describe("provider-neutral model health contract", () => {
  const now = new Date("2026-09-10T16:00:00.000Z");
  it("fails closed for missing or stale health checks", () => {
    expect(evaluateModelHealth({ modelKey: "missing", provider: "lab", status: "active" }, now).effectiveStatus).toBe("stale");
    expect(evaluateModelHealth({ modelKey: "old", provider: "lab", status: "active", lastHealthCheckAt: "2026-09-10T15:00:00.000Z" }, now).usableForNewRuns).toBe(false);
  });
  it("accepts fresh active health and rejects disabled models", () => {
    expect(evaluateModelHealth({ modelKey: "good", provider: "lab", status: "active", lastHealthCheckAt: "2026-09-10T15:59:00.000Z" }, now).usableForNewRuns).toBe(true);
    expect(evaluateModelHealth({ modelKey: "off", provider: "lab", status: "disabled", lastHealthCheckAt: now }, now).effectiveStatus).toBe("disabled");
  });
  it("selects a deterministic active fallback", () => {
    const fallback = chooseHealthFallback([{ modelKey: "z", provider: "lab", status: "active", lastHealthCheckAt: now }, { modelKey: "a", provider: "lab", status: "active", lastHealthCheckAt: now }], now);
    expect(fallback?.modelKey).toBe("a");
  });
});
