export type ArtifactExtraction = { contentType: string; text: string; lineCount: number; byteCount: number; redactionRequired: boolean; signals: string[] };
const secretPatterns = [/AKIA[0-9A-Z]{16}/, /-----BEGIN (?:RSA|OPENSSH|EC) PRIVATE KEY-----/, /(?:api[_-]?key|secret|token)[\s'\"]*[:=]\s*['\"][^'\"]{12,}/i];

export function extractArtifact(input: { contentBase64: string; contentType: string }): ArtifactExtraction {
  if (!input || typeof input.contentBase64 !== "string" || typeof input.contentType !== "string") throw new Error("Artifact input is invalid.");
  const normalizedContentType = input.contentType.trim().toLowerCase().split(";", 1)[0];
  if (!normalizedContentType || input.contentBase64.length > 2_800_000 || !/^[a-z0-9+/=_-]*$/i.test(input.contentBase64)) throw new Error("Artifact input is invalid.");
  const buffer = Buffer.from(input.contentBase64, "base64");
  if (buffer.length > 2_000_000) throw new Error("Artifact extraction is limited to 2 MB.");
  const textLike = normalizedContentType.startsWith("text/") || ["application/json", "application/csv", "text/csv"].includes(normalizedContentType);
  if (!textLike) return { contentType: normalizedContentType, text: "", lineCount: 0, byteCount: buffer.length, redactionRequired: false, signals: ["Binary artifact retained; text extraction is not available for this content type."] };
  const text = buffer.toString("utf8").replace(/\u0000/g, "");
  const signals = secretPatterns.filter(pattern => pattern.test(text)).map(() => "Potential secret detected; redact before sharing in a report.");
  return { contentType: normalizedContentType, text, lineCount: text ? text.split(/\r?\n/).length : 0, byteCount: buffer.length, redactionRequired: signals.length > 0, signals: Array.from(new Set(signals)) };
}
