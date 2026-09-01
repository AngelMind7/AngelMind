from pathlib import Path

schema = Path('/home/ubuntu/AngelMind/drizzle/schema.ts')
s = schema.read_text()
s = s.replace('export const outboxEventStatus = ["pending", "published", "failed"] as const;', 'export const outboxEventStatus = ["pending", "retrying", "published", "failed"] as const;')
s = s.replace('  attempts: int("attempts").default(0).notNull(),\n  publishedAt: timestamp("publishedAt"),\n  createdAt: timestamp("createdAt").defaultNow().notNull(),\n}, table => [uniqueIndex("outbox_event_idempotency_uq")', '  attempts: int("attempts").default(0).notNull(),\n  availableAt: timestamp("availableAt").defaultNow().notNull(),\n  lockedAt: timestamp("lockedAt"),\n  workerId: varchar("workerId", { length: 128 }),\n  lastError: text("lastError"),\n  publishedAt: timestamp("publishedAt"),\n  createdAt: timestamp("createdAt").defaultNow().notNull(),\n}, table => [uniqueIndex("outbox_event_idempotency_uq")', 1)
schema.write_text(s)

ai = Path('/home/ubuntu/AngelMind/server/ai-platform.ts')
s = ai.read_text()
s = s.replace('const WORKER_ID = process.env.WORKER_ID?.trim() || randomUUID();\nconst WORKER_LEASE_MS = 10 * 60 * 1_000;', 'const WORKER_ID = process.env.WORKER_ID?.trim() || randomUUID();\nconst WORKER_LEASE_MS = 10 * 60 * 1_000;\nconst OUTBOX_MAX_ATTEMPTS = 5;\nconst OUTBOX_LEASE_MS = 2 * 60 * 1_000;')
old = '''export async function markOutboxEventPublished(eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.update(outboxEvents).set({ status: "published", publishedAt: new Date() }).where(and(eq(outboxEvents.id, eventId), eq(outboxEvents.status, "pending")));
  return { success: true as const, eventId, status: "published" as const };
}

export async function failOutboxEvent(eventId: number, errorMessage: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [event] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, eventId)).limit(1);
  if (!event) throw new Error("Outbox event tidak ditemukan.");
  if (event.attempts >= 5) return { success: false as const, eventId, status: "failed" as const, attempts: event.attempts };
  await db.update(outboxEvents).set({ status: "failed", attempts: event.attempts + 1 }).where(and(eq(outboxEvents.id, eventId), eq(outboxEvents.status, "pending")));
  return { success: false as const, eventId, status: "failed" as const, attempts: event.attempts + 1, error: errorMessage.trim().slice(0, 4_000) };
}
'''
new = '''export async function claimOutboxEvent(eventId: number, now = new Date()) {
  const db = await getDb();
  if (!db) return { claimed: false as const, reason: "database-unavailable" as const };
  const staleBefore = new Date(now.getTime() - OUTBOX_LEASE_MS);
  await db.update(outboxEvents).set({ status: "retrying", lockedAt: null, workerId: null, availableAt: now, lastError: "Outbox lease expired." }).where(and(eq(outboxEvents.status, "retrying"), lt(outboxEvents.lockedAt, staleBefore)));
  const changed = await db.update(outboxEvents).set({ status: "retrying", lockedAt: now, workerId: WORKER_ID, attempts: sql`${outboxEvents.attempts} + 1` }).where(and(eq(outboxEvents.id, eventId), or(eq(outboxEvents.status, "pending"), eq(outboxEvents.status, "retrying")), lte(outboxEvents.availableAt, now)));
  if (!changed) return { claimed: false as const, reason: "already-claimed" as const };
  return { claimed: true as const, eventId, workerId: WORKER_ID };
}

export async function markOutboxEventPublished(eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.update(outboxEvents).set({ status: "published", publishedAt: new Date(), lockedAt: null, workerId: null, lastError: null }).where(and(eq(outboxEvents.id, eventId), eq(outboxEvents.workerId, WORKER_ID), eq(outboxEvents.status, "retrying")));
  return { success: true as const, eventId, status: "published" as const };
}

export async function failOutboxEvent(eventId: number, errorMessage: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [event] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, eventId)).limit(1);
  if (!event) throw new Error("Outbox event tidak ditemukan.");
  const attempts = event.attempts;
  const terminal = attempts >= OUTBOX_MAX_ATTEMPTS;
  const nextStatus = terminal ? "failed" : "retrying";
  const error = errorMessage.trim().slice(0, 4_000) || "Outbox handler failed.";
  const availableAt = new Date(Date.now() + Math.min(60 * 60 * 1_000, 2 ** Math.max(0, attempts - 1) * 5_000));
  await db.update(outboxEvents).set({ status: nextStatus, availableAt: terminal ? event.availableAt : availableAt, lockedAt: null, workerId: null, lastError: error }).where(and(eq(outboxEvents.id, eventId), eq(outboxEvents.workerId, WORKER_ID), eq(outboxEvents.status, "retrying")));
  return { success: !terminal as const, eventId, status: nextStatus, attempts, error };
}
'''
if old not in s:
    raise SystemExit('outbox function anchor missing')
s = s.replace(old, new)
old_dispatch = '''  const pending = await db.select().from(outboxEvents).where(eq(outboxEvents.status, "pending")).orderBy(asc(outboxEvents.createdAt)).limit(Math.min(100, Math.max(1, limit)));
'''
new_dispatch = '''  const now = new Date();
  const pending = await db.select().from(outboxEvents).where(and(or(eq(outboxEvents.status, "pending"), eq(outboxEvents.status, "retrying")), lte(outboxEvents.availableAt, now))).orderBy(asc(outboxEvents.createdAt)).limit(Math.min(100, Math.max(1, limit)));
'''
if old_dispatch not in s:
    raise SystemExit('dispatch query anchor missing')
s = s.replace(old_dispatch, new_dispatch)
s = s.replace('''    const receipt = await claimOutboxConsumer(event.id, `dispatcher:${event.eventType}`);
    if (!receipt.claimed) continue;
    claimed += 1;
    try {
''', '''    const claim = await claimOutboxEvent(event.id, now);
    if (!claim.claimed) continue;
    claimed += 1;
    try {
''')
s = s.replace('''      await handler({ id: event.id, eventType: event.eventType, aggregateType: event.aggregateType, aggregateId: event.aggregateId, schemaVersion: event.schemaVersion, payload: payload as Record<string, unknown> });
      await markOutboxEventPublished(event.id);
''', '''      await handler({ id: event.id, eventType: event.eventType, aggregateType: event.aggregateType, aggregateId: event.aggregateId, schemaVersion: event.schemaVersion, payload: payload as Record<string, unknown> });
      await claimOutboxConsumer(event.id, `dispatcher:${event.eventType}`);
      await markOutboxEventPublished(event.id);
''')
ai.write_text(s)

migration = Path('/home/ubuntu/AngelMind/drizzle/0036_outbox_retry_leases.sql')
migration.write_text('''ALTER TABLE `outboxEvents` MODIFY COLUMN `status` enum('pending','retrying','published','failed') NOT NULL DEFAULT 'pending';\nALTER TABLE `outboxEvents` ADD COLUMN `availableAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;\nALTER TABLE `outboxEvents` ADD COLUMN `lockedAt` timestamp NULL;\nALTER TABLE `outboxEvents` ADD COLUMN `workerId` varchar(128) NULL;\nALTER TABLE `outboxEvents` ADD COLUMN `lastError` text NULL;\nCREATE INDEX `outbox_event_status_available_idx` ON `outboxEvents` (`status`,`availableAt`);\nCREATE INDEX `outbox_event_worker_lease_idx` ON `outboxEvents` (`workerId`,`lockedAt`);\n''')
print('outbox hardening patch prepared')
