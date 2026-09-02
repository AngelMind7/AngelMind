import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { aiMemories, users, workspaces } from "../drizzle/schema";
import { getDb } from "./db";
import { buildMemoryContext } from "./ai-memory";

const integration = Boolean(process.env.DATABASE_URL);

describe.skipIf(!integration)("AI memory provider-context injection", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let userId: number;
  let otherUserId: number;
  let workspaceId: number;
  const memoryIds: number[] = [];

  it("includes only the caller's user memory plus the requested workspace memory, bounded and formatted", async () => {
    db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;

    const now = Date.now();
    const [user] = await db.insert(users).values({ openId: `integration-context-${now}`, name: "Context Integration", email: `context-${now}@example.invalid`, loginMethod: "integration" }).$returningId();
    userId = user.id;
    const [otherUser] = await db.insert(users).values({ openId: `integration-context-other-${now}`, name: "Context Integration Other", email: `context-other-${now}@example.invalid`, loginMethod: "integration" }).$returningId();
    otherUserId = otherUser.id;
    const [workspace] = await db.insert(workspaces).values({ ownerUserId: userId, name: `Context Integration ${now}`, programName: "Database contract", safeHarbor: "Integration-only fixture", codeOfConduct: "Integration-only fixture", allowlist: JSON.stringify(["integration.invalid"]), exclusions: JSON.stringify([]), budgetCents: 100_000, sessionLimitMinutes: 60, cooldownMinutes: 0, retentionDays: 30 }).$returningId();
    workspaceId = workspace.id;

    const retentionUntil = new Date(now + 86_400_000);
    const [userMemory] = await db.insert(aiMemories).values({ scope: "user", status: "active", userId, workspaceId: null, sessionId: null, programId: null, memoryKey: "preferences", scopeKey: `user:${userId}:0:0:0:preferences`, content: "Prefers concise report drafts.", retentionUntil, revision: 0 }).$returningId();
    const [workspaceMemory] = await db.insert(aiMemories).values({ scope: "workspace", status: "active", userId, workspaceId, sessionId: null, programId: null, memoryKey: "scope-notes", scopeKey: `workspace:${userId}:${workspaceId}:0:0:scope-notes`, content: "Target excludes the staging subdomain.", retentionUntil, revision: 0 }).$returningId();
    const [archivedMemory] = await db.insert(aiMemories).values({ scope: "workspace", status: "archived", userId, workspaceId, sessionId: null, programId: null, memoryKey: "stale-notes", scopeKey: `workspace:${userId}:${workspaceId}:0:0:stale-notes`, content: "Should not appear.", retentionUntil, archivedAt: new Date(), revision: 0 }).$returningId();
    const [otherUsersMemory] = await db.insert(aiMemories).values({ scope: "user", status: "active", userId: otherUserId, workspaceId: null, sessionId: null, programId: null, memoryKey: "preferences", scopeKey: `user:${otherUserId}:0:0:0:preferences`, content: "Belongs to a different user.", retentionUntil, revision: 0 }).$returningId();
    memoryIds.push(userMemory.id, workspaceMemory.id, archivedMemory.id, otherUsersMemory.id);

    const context = await buildMemoryContext(userId, { workspaceId });
    expect(context).toBeTruthy();
    expect(context).toContain("Prefers concise report drafts.");
    expect(context).toContain("Target excludes the staging subdomain.");
    expect(context).not.toContain("Should not appear.");
    expect(context).not.toContain("Belongs to a different user.");

    const withoutWorkspace = await buildMemoryContext(userId, {});
    expect(withoutWorkspace).toContain("Prefers concise report drafts.");
    expect(withoutWorkspace).not.toContain("Target excludes the staging subdomain.");

    const noMatch = await buildMemoryContext(otherUserId, {});
    expect(noMatch).toContain("Belongs to a different user.");
  });

  afterAll(async () => {
    if (!db) return;
    if (memoryIds.length) {
      for (const id of memoryIds) {
        await db.delete(aiMemories).where(eq(aiMemories.id, id));
      }
    }
    if (workspaceId) await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    if (userId) await db.delete(users).where(eq(users.id, userId));
    if (otherUserId) await db.delete(users).where(eq(users.id, otherUserId));
  });
});
