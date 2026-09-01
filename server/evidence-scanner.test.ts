import { describe, expect, it } from "vitest";
import { scanEvidenceContent } from "./evidence-scanner";

describe("evidence scanner", () => {
  it("passes valid text evidence", () => {
    const result = scanEvidenceContent({ bytes: Buffer.from("GET /health HTTP/1.1\n\n200 OK"), contentType: "text/plain", fileName: "capture.txt" });
    expect(result.passed).toBe(true);
    expect(result.scanner).toBe("built-in-format-safety");
  });

  it("rejects unsafe control characters", () => {
    const result = scanEvidenceContent({ bytes: Buffer.from("safe\u0000payload"), contentType: "text/plain", fileName: "capture.txt" });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("control characters");
  });

  it("rejects a binary signature mismatch", () => {
    const result = scanEvidenceContent({ bytes: Buffer.from("not-a-png"), contentType: "image/png", fileName: "capture.png" });
    expect(result.passed).toBe(false);
  });
});
