import { and, eq, lte, or, sql } from "drizzle-orm";
import { llmProviderCircuitStates, outboxEvents } from "../../drizzle/schema";
import { getDb } from "../db";

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 30_000;
const PROBE_LEASE_MS = 10_000;

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Transaction = Parameters<Database["transaction"]>[0] extends (tx: infer T, ...args: any[]) => any ? T : never;

async function ensureState(db: Database, provider: string) {
  await db.insert(llmProviderCircuitStates).values({ provider, state: "closed", consecutiveFailures: 0 }).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
}

async function emitAlert(trx: Transaction, provider: string, state: "open" | "closed", reason: string, at: Date) {
  const eventType = state === "open" ? "ai.provider.circuit.opened" : "ai.provider.circuit.recovered";
  const idempotencyKey = `llm-circuit:${provider}:${state}:${at.getTime()}`;
  await trx.insert(outboxEvents).values({
    workspaceId: null,
    eventType,
    traceId: null,
    aggregateType: "llm_provider_circuit",
    aggregateId: 0,
    idempotencyKey,
    schemaVersion: 1,
    payload: JSON.stringify({ provider, state, reason, at: at.toISOString(), severity: state === "open" ? "critical" : "info" }),
    status: "pending",
    attempts: 0,
    availableAt: at,
  }).onDuplicateKeyUpdate({ set: { payload: JSON.stringify({ provider, state, reason, at: at.toISOString(), severity: state === "open" ? "critical" : "info" }) } });
}

export async function allowDistributedProviderRequest(provider: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return true;
  await ensureState(db, provider);
  const now = new Date();
  return db.transaction(async trx => {
    const [row] = await trx.select().from(llmProviderCircuitStates).where(eq(llmProviderCircuitStates.provider, provider)).limit(1).for("update");
    if (!row || row.state === "closed") return true;
    if (row.state === "open" && (!row.nextProbeAt || row.nextProbeAt > now)) return false;
    if (row.probeLeaseUntil && row.probeLeaseUntil > now) return false;
    await trx.update(llmProviderCircuitStates).set({ state: "half_open", probeLeaseUntil: new Date(now.getTime() + PROBE_LEASE_MS), updatedAt: now }).where(eq(llmProviderCircuitStates.id, row.id));
    return true;
  });
}

export async function recordDistributedProviderSuccess(provider: string) {
  const db = await getDb();
  if (!db) return;
  await ensureState(db, provider);
  await db.transaction(async trx => {
    const [row] = await trx.select().from(llmProviderCircuitStates).where(eq(llmProviderCircuitStates.provider, provider)).limit(1).for("update");
    if (!row) return;
    const recovered = row.state !== "closed";
    const now = new Date();
    await trx.update(llmProviderCircuitStates).set({ state: "closed", consecutiveFailures: 0, openedAt: null, nextProbeAt: null, probeLeaseUntil: null, lastError: null, lastAlertState: "closed", updatedAt: now }).where(eq(llmProviderCircuitStates.id, row.id));
    if (recovered) await emitAlert(trx, provider, "closed", "Provider probe succeeded.", now);
  });
}

export async function recordDistributedProviderFailure(provider: string, error: unknown) {
  const db = await getDb();
  if (!db) return;
  await ensureState(db, provider);
  await db.transaction(async trx => {
    const [row] = await trx.select().from(llmProviderCircuitStates).where(eq(llmProviderCircuitStates.provider, provider)).limit(1).for("update");
    if (!row) return;
    const now = new Date();
    const failures = row.consecutiveFailures + 1;
    const opens = row.state === "half_open" || failures >= FAILURE_THRESHOLD;
    const errorText = (error instanceof Error ? error.message : String(error)).slice(0, 512);
    await trx.update(llmProviderCircuitStates).set({ state: opens ? "open" : row.state, consecutiveFailures: failures, openedAt: opens ? now : row.openedAt, nextProbeAt: opens ? new Date(now.getTime() + COOLDOWN_MS) : row.nextProbeAt, probeLeaseUntil: null, lastError: errorText, lastAlertState: opens ? "open" : row.lastAlertState, updatedAt: now }).where(eq(llmProviderCircuitStates.id, row.id));
    if (opens && row.state !== "open") await emitAlert(trx, provider, "open", errorText, now);
  });
}

export function distributedCircuitConfig() {
  return { failureThreshold: FAILURE_THRESHOLD, cooldownMs: COOLDOWN_MS, probeLeaseMs: PROBE_LEASE_MS };
}
