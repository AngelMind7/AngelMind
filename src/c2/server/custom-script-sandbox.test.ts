import { describe, expect, it } from "vitest";
import { analyzeCustomScript } from "./custom-script-sandbox";

describe("custom script safety analyzer", () => {
  it("accepts a benign offline fixture and fingerprints it", () => {
    const result = analyzeCustomScript("python", "print('offline analysis')");
    expect(result.accepted).toBe(true);
    expect(result.risk).toBe("low");
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.limits.execution).toBe("not-performed");
  });

  it("flags network and process primitives", () => {
    const result = analyzeCustomScript("python", "import subprocess\nimport requests\nsubprocess.run(['echo','x'])");
    expect(result.accepted).toBe(false);
    expect(result.risk).toBe("high");
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it("enforces the upload size bound", () => {
    expect(() => analyzeCustomScript("javascript", "x".repeat(256 * 1024 + 1))).toThrow(/byte limit/i);
  });
});
