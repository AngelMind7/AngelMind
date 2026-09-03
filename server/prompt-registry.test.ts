import { describe, expect, it } from "vitest";
import {
  assertActivePrompt,
  getPrompt,
  listRegisteredPrompts,
  renderPrompt,
} from "./prompt-registry";

describe("prompt registry", () => {
  it("contains one active version for each orchestration role", () => {
    const prompts = listRegisteredPrompts();
    expect(prompts).toHaveLength(4);
    expect(new Set(prompts.map(prompt => prompt.id)).size).toBe(4);
    expect(new Set(prompts.map(prompt => prompt.role))).toEqual(new Set(["scope", "evidence", "risk", "report"]));
    expect(prompts.every(prompt => prompt.status === "active" && prompt.version >= 1)).toBe(true);
  });

  it("resolves exact immutable versions", () => {
    expect(getPrompt("scope-analysis", 1)?.role).toBe("scope");
    expect(getPrompt("scope-analysis", 2)).toBeUndefined();
  });

  it("rejects inactive, missing, or role-mismatched prompts", () => {
    expect(() => assertActivePrompt("missing", 1, "scope")).toThrow();
    expect(() => assertActivePrompt("scope-analysis", 1, "report")).toThrow();
    expect(() => assertActivePrompt("scope-analysis", 1, "unknown")).toThrow();
  });

  it("renders bounded variables without silently inventing values", () => {
    const prompt = assertActivePrompt("scope-analysis", 1, "scope");
    expect(renderPrompt(prompt, { objective: "review the supplied scope" })).toContain("review the supplied scope");
    expect(renderPrompt(prompt, {})).toContain("{{objective}}");
  });
});
