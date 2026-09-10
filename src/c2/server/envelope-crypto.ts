import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const FORMAT = "v2";

function deriveKey(secret: string) {
  if (typeof secret !== "string" || secret.trim().length < 32) throw new Error("Encryption key must be at least 32 characters.");
  return createHash("sha256").update(secret, "utf8").digest();
}

function safeVersion(version: string) {
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(version)) throw new Error("Encryption key version is invalid.");
  return version;
}

export function encryptEnvelope(plaintext: string, secret: string, keyVersion: string) {
  if (typeof plaintext !== "string") throw new Error("Envelope plaintext must be a string.");
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, deriveKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [FORMAT, safeVersion(keyVersion), iv, cipher.getAuthTag(), ciphertext].map(part => typeof part === "string" ? part : part.toString("base64url")).join(".");
}

export function decryptEnvelope(serialized: string, keys: Record<string, string>) {
  if (typeof serialized !== "string") throw new Error("Encrypted envelope format is invalid.");
  const parts = serialized.split(".");
  if (parts.length !== 5 || parts[0] !== FORMAT) throw new Error("Encrypted envelope format is invalid.");
  const [, version, encodedIv, encodedTag, encodedCiphertext] = parts;
  const secret = keys[version];
  if (!secret) throw new Error("Encryption key version is unavailable.");
  const iv = Buffer.from(encodedIv, "base64url");
  const tag = Buffer.from(encodedTag, "base64url");
  const ciphertext = Buffer.from(encodedCiphertext, "base64url");
  if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) throw new Error("Encrypted envelope format is invalid.");
  const decipher = createDecipheriv(ALGORITHM, deriveKey(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function isEnvelope(value: string) { return typeof value === "string" && value.startsWith(`${FORMAT}.`); }
