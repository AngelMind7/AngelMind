import { afterAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { searchDocuments, users, workspaces } from "../drizzle/schema";
import { getDb } from "./db";
import { rebuildWorkspaceSearchIndex, searchWorkspace, upsertSearchDocument } from "./global-search";

const integration = Boolean(process.env.DATABASE_URL);

describe.skipIf(!integration)("semantic workspace search", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let userId: number;
  let otherUserId: number;
  let workspaceId: number;
  let otherWorkspaceId: number;
  const documentIds: number[] = [];

  it("ranks semantic matches and never crosses workspace boundaries", async () => {
    db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;

    const now = Date.now();
    const [user] = await db.insert(users).values({ openId: `integration-semantic-${now}`, name: "Semantic Integration", email: `semantic-${now}@example.invalid`, loginMethod: "integration" }).$returningId();
    userId = user.id;
    const [otherUser] = await db.insert(users).values({ openId: `integration-semantic-other-${now}`, name: "Semantic Integration Other", email: `semantic-other-${now}@example.invalid`, loginMethod: "integration" }).$returningId();
    otherUserId = otherUser.id;
    const workspaceValues = { name: `Semantic Integration ${now}`, programName: "Database contract", safeHarbor: "Integration-only fixture", codeOfConduct: "Integration-only fixture", allowlist: JSON.stringify(["integration.invalid"]), exclusions: JSON.stringify([]), budgetCents: 100_000, sessionLimitMinutes: 60, cooldownMinutes: 0, retentionDays: 30 };
    const [workspace] = await db.insert(workspaces).values({ ...workspaceValues, ownerUserId: userId }).$returningId();
    workspaceId = workspace.id;
    const [otherWorkspace] = await db.insert(workspaces).values({ ...workspaceValues, ownerUserId: otherUserId, name: `Semantic Other ${now}` }).$returningId();
    otherWorkspaceId = otherWorkspace.id;

    await upsertSearchDocument({ workspaceId, entityType: "note", entityId: 91001, title: "Authentication observation", body: "The login response exposes a credential-bearing token in an unexpected header." });
    await upsertSearchDocument({ workspaceId, entityType: "note", entityId: 91002, title: "Deployment note", body: "The staging deployment uses a routine release process with no authentication finding." });
    await upsertSearchDocument({ workspaceId: otherWorkspaceId, entityType: "note", entityId: 92001, title: "Other workspace secret", body: "The credential exposure belongs to another workspace and must not be returned." });

    const indexed = await db.select({ id: searchDocuments.id, semanticVector: searchDocuments.semanticVector }).from(searchDocuments).where(eq(searchDocuments.workspaceId, workspaceId));
    documentIds.push(...indexed.map(row => row.id));
    expect(indexed).toHaveLength(2);
    expect(indexed.every(row => typeof row.semanticVector === "string" && JSON.parse(row.semanticVector).length === 96)).toBe(true);

    const result = await searchWorkspace(userId, { workspaceId, query: "credential exposure", limit: 2 });
    expect(result.results[0]).toMatchObject({ entityType: "note", id: 91001 });
    expect(result.results).not.toContainEqual(expect.objectContaining({ id: 92001 }));

    const legacyId = indexed[0]?.id;
    if (legacyId) {
      await db.update(searchDocuments).set({ semanticVector: null }).where(eq(searchDocuments.id, legacyId));
      const fallback = await searchWorkspace(userId, { workspaceId, query: "authentication observation", limit: 2 });
      expect(fallback.results).toContainEqual(expect.objectContaining({ id: 91001 }));
    }
  });

  afterAll(async () => {
    if (!db) return;
    if (documentIds.length) await db.delete(searchDocuments).where(inArray(searchDocuments.id, documentIds));
    if (workspaceId) await db.delete(searchDocuments).where(eq(searchDocuments.workspaceId, workspaceId));
    if (otherWorkspaceId) await db.delete(searchDocuments).where(eq(searchDocuments.workspaceId, otherWorkspaceId));
    if (workspaceId) await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    if (otherWorkspaceId) await db.delete(workspaces).where(eq(workspaces.id, otherWorkspaceId));
    if (userId) await db.delete(users).where(eq(users.id, userId));
    if (otherUserId) await db.delete(users).where(eq(users.id, otherUserId));
  });
});
