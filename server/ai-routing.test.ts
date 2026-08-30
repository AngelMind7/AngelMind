import { describe, expect, it } from "vitest";
import { selectBestRegisteredModel, type RegisteredModel } from "./ai-routing";

const models: RegisteredModel[] = [
  { modelKey: "fast-cheap", gateway: "9router", capabilities: ["text"], contextWindow: 16_000, status: "active", lastLatencyMs: 300, inputCostPerMillionCents: 10, outputCostPerMillionCents: 20 },
  { modelKey: "deep-healthy", gateway: "omniroute", capabilities: ["text", "vision"], contextWindow: 128_000, status: "active", lastLatencyMs: 500, inputCostPerMillionCents: 40, outputCostPerMillionCents: 60, priority: 2 },
  { modelKey: "degraded-vision", gateway: "omniroute", capabilities: ["text", "vision"], contextWindow: 128_000, status: "degraded", lastLatencyMs: 100, inputCostPerMillionCents: 1, outputCostPerMillionCents: 1 },
];

describe("selectBestRegisteredModel", () => {
  it("selects a healthy model satisfying required capability and context", () => {
    const decision = selectBestRegisteredModel(models, { capabilities: ["vision"], minimumContextWindow: 64_000 });
    expect(decision.model.modelKey).toBe("deep-healthy");
    expect(decision.reasons.join(" ")).toContain("1/1 required capabilities matched");
  });

  it("filters degraded models unless explicitly allowed", () => {
    expect(() => selectBestRegisteredModel(models, { capabilities: ["vision"], maxCostCentsPerMillionTokens: 10 })).toThrow("No registered AI model");
    expect(selectBestRegisteredModel(models, { capabilities: ["vision"], maxCostCentsPerMillionTokens: 10, allowDegraded: true }).model.modelKey).toBe("degraded-vision");
  });
});
