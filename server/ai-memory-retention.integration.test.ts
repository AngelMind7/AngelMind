import { afterAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { aiRunOutputs, aiRuns, users, workspaces } from "../drizzle/schema";
import { getDb } from "./db";
import { getAiRunOutput, purgeExpiredAiRunMemory } from "./ai-platform";

const integration = Boolean(process.env.DATABASE_URL);

describe.skipIf(!integration)("AI memory retention database integration", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let userId: number;
  let workspaceId: number;
  const runIds: number[] = [];

  it("purges only expired payloads and preserves run metadata and trace lineage", async () => {
    db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;

    const [user] = await db.insert(users).values({ openId: `integration-retention-${Date.now()}`, name: "Retention Integration", email: `retention-${Date.now()}@example.invalid`, loginMethod: "integration" }).$returningId();
    userId = user.id;
    const [workspace] = await db.insert(workspaces).values({ ownerUserId: userId, name: `Retention Integration ${Date.now()}`, programName: "Database contract", safeHarbor: "Integration-only fixture", codeOfConduct: "Integration-only fixture", allowlist: JSON.stringify(["integration.invalid"]), exclusions: JSON.stringify([]), budgetCents: 100_000, sessionLimitMinutes: 60, cooldownMinutes: 0, retentionDays: 30 }).$returningId();
    workspaceId = workspace.id;

    const now = Date.now();
    const [expired] = await db.insert(aiRuns).values({ workspaceId, userId, modelKey: "integration-model", gateway: "integration", purpose: "retention-test", traceId: `trace-expired-${now}`, inputReference: "memory://input-expired", outputReference: "memory://output-expired", status: "completed", retentionUntil: new Date(now - 60_000) }).$returningId();
    const [active] = await db.insert(aiRuns).values({ workspaceId, userId, modelKey: "integration-model", gateway: "integration", purpose: "retention-test", traceId: `trace-active-${now}`, inputReference: "memory://input-active", outputReference: "memory://output-active", status: "completed", retentionUntil: new Date(now + 86_400_000) }).$returningId();
    runIds.push(expired.id, active.id);
    await db.insert(aiRunOutputs).values([
      { workspaceId, runId: expired.id, outputJson: JSON.stringify({ secret: "expired" }) },
      { workspaceId, runId: active.id, outputJson: JSON.stringify({ secret: "active" }) },
    ]);

    expect(await getAiRunOutput(userId, expired.id)).toBeNull();
    expect(await getAiRunOutput(userId, active.id)).toMatchObject({ runId: active.id });
    const first = await purgeExpiredAiRunMemory(1);
    expect(first.inspected).toBe(1);
    expect(first.purged).toBe(1);
    const [expiredAfter] = await db.select().from(aiRuns).where(eq(aiRuns.id, expired.id));
    const [activeAfter] = await db.select().from(aiRuns).where(eq(aiRuns.id, active.id));
    expect(expiredAfter.inputReference).toBe("retention://purged");
    expect(expiredAfter.outputReference).toBeNull();
    expect(expiredAfter.traceId).toBe(`trace-expired-${now}`);
    expect(activeAfter.inputReference).toBe("memory://input-active");
    expect(activeAfter.outputReference).toBe("memory://output-active");
    expect((await db.select().from(aiRunOutputs).where(eq(aiRunOutputs.runId, expired.id))).length).toBe(0);
    expect((await db.select().from(aiRunOutputs).where(eq(aiRunOutputs.runId, active.id))).length).toBe(1);

    const second = await purgeExpiredAiRunMemory(100);
    expect(second.inspected).toBe(0);
    expect(second.purged).toBe(0);
  });

  afterAll(async () => {
    if (!db || !workspaceId) return;
    await db.delete(aiRunOutputs).where(eq(aiRunOutputs.workspaceId, workspaceId));
    if (runIds.length) await db.delete(aiRuns).where(and(eq(aiRuns.workspaceId, workspaceId), inArray(aiRuns.id, runIds)));
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    if (userId) await db.delete(users).where(eq(users.id, userId));
  });
});
