import { createHash, randomUUID } from "node:crypto";

export type IntelligenceKind = "cve" | "ioc" | "threat_actor" | "brand_mention" | "signal";
export type IndicatorType = "ipv4" | "ipv6" | "domain" | "url" | "hash" | "email" | "cve";
export type SourceKind = "provider" | "workspace" | "research";

export interface IntelligenceSource {
  id: string;
  name: string;
  kind: SourceKind;
  provider: string;
  enabled: boolean;
  rateLimitPerMinute: number;
  provenanceRequired: true;
  legalBasis: "workspace_policy" | "contract" | "public_source";
}

export interface Indicator {
  id: string;
  type: IndicatorType;
  value: string;
  normalizedValue: string;
  confidence: number;
  sourceId: string;
  firstSeen: string;
  lastSeen: string;
}

export interface ThreatActorReference {
  id: string;
  name: string;
  aliases: string[];
  techniqueIds: string[];
  signalIds: string[];
  sourceId: string;
}

export interface IntelligenceRecord {
  id: string;
  workspaceId: number;
  kind: IntelligenceKind;
  title: string;
  summary: string;
  sourceId: string;
  confidence: number;
  createdAt: string;
  contentHash: string;
  provenance: { sourceId: string; collectedAt: string; bounded: true };
}

const sources = new Map<string, IntelligenceSource>();
const indicators = new Map<string, Indicator>();
const actors = new Map<string, ThreatActorReference>();
const records = new Map<string, IntelligenceRecord>();

export function registerIntelligenceSource(input: Omit<IntelligenceSource, "id" | "provenanceRequired">) {
  if (!input.name || !input.provider || input.rateLimitPerMinute < 1) throw new Error("Invalid intelligence source");
  if (!input.legalBasis) throw new Error("Legal basis is required");
  const source = { ...input, id: `tis_${randomUUID()}`, provenanceRequired: true as const };
  sources.set(source.id, source);
  return source;
}

export function listIntelligenceSources() { return [...sources.values()]; }

export function ingestIntelligence(input: { workspaceId: number; kind: IntelligenceKind; title: string; summary: string; sourceId: string; confidence?: number }) {
  if (!Number.isInteger(input.workspaceId) || input.workspaceId < 1) throw new Error("workspaceId must be positive");
  const source = sources.get(input.sourceId);
  if (!source?.enabled) throw new Error("Intelligence source is disabled or unknown");
  const confidence = Math.max(0, Math.min(1, input.confidence ?? 0.5));
  const createdAt = new Date().toISOString();
  const contentHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const record: IntelligenceRecord = { id: `ti_${randomUUID()}`, ...input, confidence, createdAt, contentHash, provenance: { sourceId: source.id, collectedAt: createdAt, bounded: true } };
  records.set(record.id, record);
  return record;
}

export function normalizeIndicator(type: IndicatorType, value: string) {
  const normalizedValue = value.trim().toLowerCase().replace(/\.$/, "");
  if (!normalizedValue) throw new Error("Indicator value is required");
  return normalizedValue;
}

export function upsertIndicator(input: { type: IndicatorType; value: string; confidence: number; sourceId: string }) {
  const source = sources.get(input.sourceId);
  if (!source?.enabled) throw new Error("Intelligence source is disabled or unknown");
  const normalizedValue = normalizeIndicator(input.type, input.value);
  const existing = [...indicators.values()].find(i => i.type === input.type && i.normalizedValue === normalizedValue);
  const now = new Date().toISOString();
  if (existing) { existing.confidence = Math.max(existing.confidence, Math.min(1, input.confidence)); existing.lastSeen = now; return existing; }
  const indicator: Indicator = { id: `ioc_${randomUUID()}`, type: input.type, value: input.value.trim(), normalizedValue, confidence: Math.max(0, Math.min(1, input.confidence)), sourceId: input.sourceId, firstSeen: now, lastSeen: now };
  indicators.set(indicator.id, indicator);
  return indicator;
}

export function listIndicators(type?: IndicatorType) { return [...indicators.values()].filter(i => !type || i.type === type); }

export function mapThreatActor(input: Omit<ThreatActorReference, "id">) {
  if (!input.name || !input.sourceId) throw new Error("Actor name and source are required");
  const actor: ThreatActorReference = { ...input, id: `actor_${randomUUID()}` };
  actors.set(actor.id, actor);
  return actor;
}

export function listThreatActors() { return [...actors.values()]; }
export function listIntelligence(workspaceId: number) { return [...records.values()].filter(r => r.workspaceId === workspaceId); }

// External collection is deliberately provider-gated; this adapter only returns a plan.
export function buildCollectionPlan(sourceId: string, workspaceId: number) {
  const source = sources.get(sourceId);
  if (!source?.enabled) throw new Error("Intelligence source is disabled or unknown");
  if (!Number.isInteger(workspaceId) || workspaceId < 1) throw new Error("workspaceId must be positive");
  return { sourceId, workspaceId, provider: source.provider, rateLimitPerMinute: source.rateLimitPerMinute, legalBasis: source.legalBasis, requiresWorkspacePolicy: true, targetCollectionEnabled: false };
}

export function resetThreatIntelligenceForTests() { sources.clear(); indicators.clear(); actors.clear(); records.clear(); }
