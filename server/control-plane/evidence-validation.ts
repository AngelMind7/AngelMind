const MIME_EXTENSION_MAP: Record<string, string[]> = {
  "application/json": [".json"],
  "application/pdf": [".pdf"],
  "application/zip": [".zip"],
  "image/gif": [".gif"],
  "image/jpeg": [".jpeg", ".jpg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "text/csv": [".csv"],
  "text/plain": [".txt", ".log", ".md"],
};

const MAGIC_RULES: Record<string, (bytes: Buffer) => boolean> = {
  "application/pdf": bytes => bytes.subarray(0, 5).toString("ascii") === "%PDF-",
  "application/zip": bytes => bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && [0x03, 0x05, 0x07].includes(bytes[2]) && [0x04, 0x06, 0x08].includes(bytes[3]),
  "image/gif": bytes => bytes.subarray(0, 4).toString("ascii") === "GIF8",
  "image/jpeg": bytes => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": bytes => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": bytes => bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP",
};

function normalizedMime(contentType: string) {
  return contentType.trim().toLowerCase().split(";", 1)[0];
}

function validateTextSafety(bytes: Buffer) {
  const sample = bytes.subarray(0, Math.min(bytes.length, 1_000_000)).toString("utf8");
  const controlCharacters = Array.from(sample).filter(character => character !== "\n" && character !== "\r" && character !== "\t" && character.charCodeAt(0) < 0x20).length;
  if (controlCharacters > Math.max(4, sample.length * 0.01)) throw new Error("Text evidence contains an unsafe control-character ratio.");
}

function validateZipSafety(bytes: Buffer) {
  let entries = 0;
  for (let offset = 0; offset + 4 <= bytes.length && entries <= 1_000; offset += 1) {
    if (bytes.readUInt32LE(offset) === 0x04034b50) entries += 1;
  }
  if (entries > 1_000) throw new Error("ZIP evidence contains too many archive entries.");
  if (entries > 0 && bytes.length < entries * 30) throw new Error("ZIP evidence has an invalid archive structure.");
}

export function validateEvidenceBytes(input: { contentType: string; fileName: string; bytes: Buffer }) {
  const contentType = normalizedMime(input.contentType);
  if (!MIME_EXTENSION_MAP[contentType]) throw new Error(`Unsupported evidence content type: ${contentType || "missing"}.`);
  const extension = input.fileName.toLowerCase().slice(input.fileName.lastIndexOf("."));
  if (extension && extension !== input.fileName.toLowerCase() && !MIME_EXTENSION_MAP[contentType].includes(extension)) {
    throw new Error("Evidence file extension does not match its declared content type.");
  }
  const magicRule = MAGIC_RULES[contentType];
  if (magicRule && !magicRule(input.bytes)) throw new Error("Evidence bytes do not match the declared content type.");
  if (contentType === "image/png" && input.bytes.length >= 24) {
    const width = input.bytes.readUInt32BE(16);
    const height = input.bytes.readUInt32BE(20);
    if (width === 0 || height === 0 || width > 10_000 || height > 10_000) throw new Error("PNG evidence dimensions exceed the safe limit.");
  }
  if (["text/plain", "text/csv"].includes(contentType)) validateTextSafety(input.bytes);
  if (contentType === "application/zip") validateZipSafety(input.bytes);
  return { contentType } as const;
}

export function isSupportedEvidenceType(contentType: string) {
  return Boolean(MIME_EXTENSION_MAP[normalizedMime(contentType)]);
}
