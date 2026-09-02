import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function signArchiveManifest(manifestHash: string, secret: string): string {
  return createHmac("sha256", secret).update(`angelmind.audit-archive.v1:${manifestHash}`).digest("hex");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function verifyArchiveIntegrity(manifestJson: string, expectedHash: string, expectedSignature: string, secret: string): boolean {
  const hash = sha256(manifestJson);
  return constantTimeEqual(hash, expectedHash) && constantTimeEqual(signArchiveManifest(hash, secret), expectedSignature);
}
