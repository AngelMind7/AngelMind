import { and, desc, eq, ne } from "drizzle-orm";
import { findings } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";

function tokens(value: string) {
  return new Set(value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").split(/\s+/).filter(token => token.length >= 3));
}
function similarity(left: string, right: string) {
  const a = tokens(left); const b = tokens(right);
  if (!a.size || !b.size) return { score: 0, sharedTokens: [] as string[] };
  const sharedTokens: string[] = []; for (const token of a) if (b.has(token)) sharedTokens.push(token);
  return { score: sharedTokens.length / (a.size + b.size - sharedTokens.length), sharedTokens: sharedTokens.sort().slice(0, 25) };
}
export async function findDuplicateCandidates(userId: number, input: { workspaceId: number; title: string; impactSummary: string; reportDraft?: string; excludeFindingId?: number; limit?: number }) {
  if (!(await canAccessWorkspace(userId, input.workspaceId, "read"))) throw new Error("Workspace tidak dapat diakses.");
  const db = await getDb(); if (!db) return [];
  const rows = await db.select().from(findings).where(and(eq(findings.workspaceId, input.workspaceId), input.excludeFindingId ? ne(findings.id, input.excludeFindingId) : undefined)).orderBy(desc(findings.updatedAt)).limit(500);
  const source = `${input.title} ${input.impactSummary} ${input.reportDraft ?? ""}`;
  return rows.map(row => {
    const match = similarity(source, `${row.title} ${row.impactSummary} ${row.reportDraft}`);
    const score = Number(match.score.toFixed(4));
    return {
      finding: row,
      similarity: score,
      matchStrength: score >= 0.7 ? "strong" as const : score >= 0.4 ? "moderate" as const : "weak" as const,
      sharedTokens: match.sharedTokens,
      historical: { status: row.status, lastUpdatedAt: row.updatedAt, fingerprint: row.fingerprint },
      reason: "token-overlap workspace candidate; human review required",
    };
  }).filter(candidate => candidate.similarity >= 0.2).sort((left, right) => right.similarity - left.similarity || right.finding.updatedAt.getTime() - left.finding.updatedAt.getTime()).slice(0, Math.min(25, Math.max(1, input.limit ?? 5)));
}
