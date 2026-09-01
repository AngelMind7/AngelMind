import { validateEvidenceBytes } from "./control-plane/evidence-validation";

export type EvidenceScanResult = {
  passed: boolean;
  reason: string;
  scanner: "built-in-format-safety";
};

export function scanEvidenceContent(input: { bytes: Buffer; contentType: string; fileName: string }): EvidenceScanResult {
  try {
    validateEvidenceBytes({ contentType: input.contentType, fileName: input.fileName, bytes: input.bytes });
  } catch (error) {
    return { passed: false, reason: error instanceof Error ? error.message.slice(0, 2_000) : "Evidence format validation failed.", scanner: "built-in-format-safety" };
  }

  if (input.bytes.length === 0) {
    return { passed: false, reason: "Evidence is empty.", scanner: "built-in-format-safety" };
  }

  const textTypes = input.contentType.startsWith("text/") || input.contentType === "application/json";
  if (textTypes) {
    const text = input.bytes.toString("utf8");
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) {
      return { passed: false, reason: "Evidence contains unsafe control characters.", scanner: "built-in-format-safety" };
    }
  }

  return { passed: true, reason: "Format, size, signature, and text safety checks passed.", scanner: "built-in-format-safety" };
}
