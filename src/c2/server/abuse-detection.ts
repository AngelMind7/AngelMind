import { createHash } from "node:crypto";

export type AbuseDecision = {
  score: number;
  strikes: number;
  blockedUntil: number;
  action: "allow" | "observe" | "cooldown";
};

type AbuseRecord = { strikes: number; score: number; blockedUntil: number; lastSeenAt: number; violations: number; credentialVariants: Set<string> };
const records = new Map<string, AbuseRecord>();
const MAX_RECORDS = 20_000;
const RETENTION_MS = 24 * 60 * 60 * 1_000;

function digest(value: string) { return createHash("sha256").update(value).digest("hex").slice(0, 16); }
function evict(now: number) {
  for (const [key, record] of records) if (record.lastSeenAt + RETENTION_MS <= now) records.delete(key);
  while (records.size > MAX_RECORDS) records.delete(records.keys().next().value!);
}

export function recordAbuseViolation(key: string, input: { credentialFingerprint?: string; cooldownMs: number; strikeThreshold: number; now?: number }): AbuseDecision {
  const now = input.now ?? Date.now();
  evict(now);
  const record = records.get(key) ?? { strikes: 0, score: 0, blockedUntil: 0, lastSeenAt: now, violations: 0, credentialVariants: new Set<string>() };
  record.lastSeenAt = now;
  record.violations += 1;
  record.strikes += 1;
  record.score = Math.min(100, record.score + 10 + Math.min(25, record.credentialVariants.size * 5));
  if (input.credentialFingerprint) record.credentialVariants.add(digest(input.credentialFingerprint));
  if (record.strikes >= input.strikeThreshold) record.blockedUntil = now + Math.min(input.cooldownMs * 2 ** Math.min(record.strikes - input.strikeThreshold, 4), 86_400_000);
  records.set(key, record);
  return { score: record.score, strikes: record.strikes, blockedUntil: record.blockedUntil, action: record.blockedUntil > now ? "cooldown" : record.violations > 1 ? "observe" : "allow" };
}

export function getAbuseDetectionSnapshot(now = Date.now()) {
  evict(now);
  return [...records.entries()].map(([key, record]) => ({ key: digest(key), score: record.score, strikes: record.strikes, violations: record.violations, credentialVariantCount: record.credentialVariants.size, blockedUntil: record.blockedUntil || null, lastSeenAt: record.lastSeenAt })).sort((a, b) => b.score - a.score).slice(0, 100);
}

export function resetAbuseDetectionForTests() { records.clear(); }
