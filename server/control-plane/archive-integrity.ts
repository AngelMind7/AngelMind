import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function sha256(value: string): string {
  if (typeof value !== "string") throw new Error("Archive data must be a string.");
  return createHash("sha256").update(value).digest("hex");
}

export function signArchiveManifest(manifestHash: string, secret: string): string {
  if (typeof manifestHash !== "string" || !/^[a-f0-9]{64}$/i.test(manifestHash) || typeof secret !== "string" || secret.length < 16) throw new Error("Archive signing input is invalid.");
  return createHmac("sha256", secret).update(`angelmind.audit-archive.v1:${manifestHash}`).digest("hex");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function verifyArchiveIntegrity(manifestJson: string, expectedHash: string, expectedSignature: string, secret: string): boolean {
  if (typeof expectedHash !== "string" || typeof expectedSignature !== "string") return false;
  let hash: string;
  try { hash = sha256(manifestJson); } catch { return false; }
  try { return constantTimeEqual(hash, expectedHash) && constantTimeEqual(signArchiveManifest(hash, secret), expectedSignature); } catch { return false; }
}

export function assertArchiveManifest(manifestJson: string, expectedWorkspaceId: number) {
  if (typeof manifestJson !== "string" || !Number.isInteger(expectedWorkspaceId) || expectedWorkspaceId < 1) throw new Error("Archive manifest schema or workspace identity is invalid.");
  let manifest: Record<string, unknown>;
  try {
    const parsed = JSON.parse(manifestJson) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not-object");
    manifest = parsed as Record<string, unknown>;
  } catch {
    throw new Error("Archive manifest JSON is invalid.");
  }
  if (manifest.schema !== "angelmind.audit-archive.v1" || manifest.workspaceId !== expectedWorkspaceId) throw new Error("Archive manifest schema or workspace identity is invalid.");
  for (const key of ["auditEvents", "evidence", "runs", "approvals", "notifications"]) if (manifest[key] !== undefined && !Array.isArray(manifest[key])) throw new Error(`Archive manifest field '${key}' must be an array.`);
  return manifest;
}

export function assertRestoreDrillEvidence(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Restore drill evidence must be an object.");
  const evidence = input as Record<string, unknown>;
  const requiredStrings = ["archiveId", "startedAt", "completedAt", "owner", "sourceBackupId", "databaseChecksum", "objectChecksum", "decision"];
  for (const key of requiredStrings) if (typeof evidence[key] !== "string" || !String(evidence[key]).trim()) throw new Error(`Restore drill evidence field '${key}' is required.`);
  if (!/^(pass|fail)$/.test(String(evidence.decision))) throw new Error("Restore drill decision must be pass or fail.");
  for (const key of ["databaseChecksum", "objectChecksum"]) if (!/^[a-f0-9]{64}$/i.test(String(evidence[key]))) throw new Error(`Restore drill field '${key}' must be a SHA-256 checksum.`);
  for (const key of ["recordsChecked", "rtoSeconds", "rpoSeconds"]) if (!Number.isFinite(Number(evidence[key])) || Number(evidence[key]) < 0) throw new Error(`Restore drill field '${key}' must be a non-negative number.`);
  return evidence;
}
