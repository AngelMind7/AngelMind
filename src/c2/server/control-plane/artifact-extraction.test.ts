import { describe, expect, it } from "vitest";
import { extractArtifact } from "./artifact-extraction";

describe("artifact extraction", () => {
  it("extracts text and reports line/byte metadata", () => {
    const result = extractArtifact({ contentType: "text/plain", contentBase64: Buffer.from("one\ntwo").toString("base64") });
    expect(result.text).toBe("one\ntwo");
    expect(result.lineCount).toBe(2);
    expect(result.redactionRequired).toBe(false);
  });
  it("detects secrets without returning a secret-specific payload", () => {
    const result = extractArtifact({ contentType: "application/json", contentBase64: Buffer.from('{"api_key":"super-secret-value-123"}').toString("base64") });
    expect(result.redactionRequired).toBe(true);
    expect(result.signals[0]).toContain("redact");
  });
  it("retains binary boundary without pretending to extract it", () => {
    const result = extractArtifact({ contentType: "application/pdf", contentBase64: Buffer.from("binary").toString("base64") });
    expect(result.text).toBe("");
    expect(result.signals[0]).toContain("Binary artifact");
  });
});
