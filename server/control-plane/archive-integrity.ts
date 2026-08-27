import { createHash, createHmac } from "crypto";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function signArchiveManifest(manifestHash: string, secret: string): string {
  return createHmac("sha256", secret).update(`angelmind.audit-archive.v1:${manifestHash}`).digest("hex");
}

export function verifyArchiveIntegrity(manifestJson: string, expectedHash: string, expectedSignature: string, secret: string): boolean {
  const hash = sha256(manifestJson);
  return hash === expectedHash && signArchiveManifest(hash, secret) === expectedSignature;
}
