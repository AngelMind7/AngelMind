export type ArtifactExtraction = { contentType: string; text: string; lineCount: number; byteCount: number; redactionRequired: boolean; signals: string[] };
const secretPatterns = [/AKIA[0-9A-Z]{16}/, /-----BEGIN (?:RSA|OPENSSH|EC) PRIVATE KEY-----/, /(?:api[_-]?key|secret|token)[\s'\"]*[:=]\s*['\"][^'\"]{12,}/i];

export function extractArtifact(input: { contentBase64: string; contentType: string }): ArtifactExtraction {
  const buffer = Buffer.from(input.contentBase64, "base64");
  if (buffer.length > 2_000_000) throw new Error("Artifact extraction is limited to 2 MB.");
  const textLike = input.contentType.startsWith("text/") || ["application/json", "application/csv", "text/csv"].includes(input.contentType);
  if (!textLike) return { contentType: input.contentType, text: "", lineCount: 0, byteCount: buffer.length, redactionRequired: false, signals: ["Binary artifact retained; text extraction is not available for this content type."] };
  const text = buffer.toString("utf8").replace(/\u0000/g, "");
  const signals = secretPatterns.filter(pattern => pattern.test(text)).map(() => "Potential secret detected; redact before sharing in a report.");
  return { contentType: input.contentType, text, lineCount: text ? text.split(/\r?\n/).length : 0, byteCount: buffer.length, redactionRequired: signals.length > 0, signals: Array.from(new Set(signals)) };
}
