import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";

function deriveKey(secret: string) {
  if (secret.trim().length < 32) throw new Error("AUDIT_STATE_ENCRYPTION_KEY must be at least 32 characters.");
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptAuditState(value: unknown, secret: string) {
  const plaintext = JSON.stringify(value);
  if (plaintext === undefined) throw new Error("Audit state must be JSON-serializable.");
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, deriveKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}.${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptAuditState(serialized: string, secret: string) {
  if (typeof serialized !== "string") throw new Error("Encrypted audit state format is invalid.");
  const parts = serialized.split(".");
  if (parts.length !== 4) throw new Error("Encrypted audit state format is invalid.");
  const [version, encodedIv, encodedTag, encodedCiphertext] = parts;
  if (version !== VERSION || !encodedIv || !encodedTag || !encodedCiphertext) throw new Error("Encrypted audit state format is invalid.");
  const decipher = createDecipheriv(ALGORITHM, deriveKey(secret), Buffer.from(encodedIv, "base64url"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(encodedCiphertext, "base64url")), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext) as unknown;
}

export function isEncryptedAuditState(value: string) {
  return typeof value === "string" && value.startsWith(`${VERSION}.`);
}
