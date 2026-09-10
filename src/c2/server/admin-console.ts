import { count, eq } from "drizzle-orm";
import { jobs, notificationDeliveries, outboxEvents, users, workspaces } from "../database/schema";
import { getDb } from "./db";

export async function getAdminOperationalSnapshot() {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [[userCount], [workspaceCount], [queuedJobs], [runningJobs], [deadLetterJobs], [pendingOutbox], [failedOutbox], [failedDeliveries]] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(workspaces),
    db.select({ value: count() }).from(jobs).where(eq(jobs.status, "queued")),
    db.select({ value: count() }).from(jobs).where(eq(jobs.status, "running")),
    db.select({ value: count() }).from(jobs).where(eq(jobs.status, "dead_letter")),
    db.select({ value: count() }).from(outboxEvents).where(eq(outboxEvents.status, "pending")),
    db.select({ value: count() }).from(outboxEvents).where(eq(outboxEvents.status, "failed")),
    db.select({ value: count() }).from(notificationDeliveries).where(eq(notificationDeliveries.status, "failed")),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    users: Number(userCount?.value ?? 0),
    workspaces: Number(workspaceCount?.value ?? 0),
    jobs: { queued: Number(queuedJobs?.value ?? 0), running: Number(runningJobs?.value ?? 0), deadLetter: Number(deadLetterJobs?.value ?? 0) },
    outbox: { pending: Number(pendingOutbox?.value ?? 0), failed: Number(failedOutbox?.value ?? 0) },
    notificationDeliveries: { failed: Number(failedDeliveries?.value ?? 0) },
  };
}
