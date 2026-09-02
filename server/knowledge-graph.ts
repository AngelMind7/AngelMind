import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";
import { knowledgeEdges, knowledgeNodes } from "../drizzle/schema";
import { upsertSearchDocument } from "./global-search";

const normalizeJson = (value: Record<string, unknown> | undefined) => JSON.stringify(value ?? {});

async function requireAccess(userId: number, workspaceId: number, intent: "read" | "respond" = "read") {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  if (!(await canAccessWorkspace(userId, workspaceId, intent))) throw new Error("Workspace tidak ditemukan atau tidak dapat diakses.");
  return db;
}

export async function listGraph(userId: number, workspaceId: number, input?: { nodeType?: typeof knowledgeNodes.$inferSelect.nodeType; status?: "active" | "archived" }) {
  const db = await requireAccess(userId, workspaceId);
  const filters = [eq(knowledgeNodes.workspaceId, workspaceId)];
  if (input?.nodeType) filters.push(eq(knowledgeNodes.nodeType, input.nodeType));
  if (input?.status) filters.push(eq(knowledgeNodes.status, input.status));
  const nodes = await db.select().from(knowledgeNodes).where(and(...filters)).orderBy(asc(knowledgeNodes.id));
  const edges = await db.select().from(knowledgeEdges).where(eq(knowledgeEdges.workspaceId, workspaceId)).orderBy(asc(knowledgeEdges.id));
  return { nodes, edges };
}

export async function upsertNode(userId: number, input: { workspaceId: number; nodeType: typeof knowledgeNodes.$inferSelect.nodeType; externalId: string; label: string; properties?: Record<string, unknown> }) {
  const db = await requireAccess(userId, input.workspaceId, "respond");
  const externalId = input.externalId.trim();
  const label = input.label.trim();
  if (!externalId || !label) throw new Error("Node externalId dan label wajib diisi.");
  await db.insert(knowledgeNodes).values({ workspaceId: input.workspaceId, nodeType: input.nodeType, externalId, label, properties: normalizeJson(input.properties), createdByUserId: userId }).onDuplicateKeyUpdate({ set: { label, properties: normalizeJson(input.properties), status: "active", updatedAt: new Date() } });
  const [node] = await db.select().from(knowledgeNodes).where(and(eq(knowledgeNodes.workspaceId, input.workspaceId), eq(knowledgeNodes.nodeType, input.nodeType), eq(knowledgeNodes.externalId, externalId))).limit(1);
  if (!node) throw new Error("Knowledge node tidak dapat disimpan.");
  await upsertSearchDocument({ workspaceId: node.workspaceId, entityType: "knowledge_node", entityId: node.id, title: node.label, body: [node.nodeType, node.externalId, node.properties, `status:${node.status}`].join("\\n") });
  return node;
}

export async function createEdge(userId: number, input: { workspaceId: number; sourceNodeId: number; targetNodeId: number; relationType: string; confidence?: number; provenance?: Record<string, unknown> }) {
  const db = await requireAccess(userId, input.workspaceId, "respond");
  if (input.sourceNodeId === input.targetNodeId) throw new Error("Self-loop knowledge edge tidak diizinkan.");
  const nodeIds = await db.select({ id: knowledgeNodes.id }).from(knowledgeNodes).where(and(eq(knowledgeNodes.workspaceId, input.workspaceId), inArray(knowledgeNodes.id, [input.sourceNodeId, input.targetNodeId])));
  if (nodeIds.length !== 2) throw new Error("Source dan target node harus berada pada workspace yang sama.");
  const relationType = input.relationType.trim();
  if (!relationType) throw new Error("Relation type wajib diisi.");
  const confidence = Math.min(100, Math.max(0, Math.trunc(input.confidence ?? 100)));
  await db.insert(knowledgeEdges).values({ workspaceId: input.workspaceId, sourceNodeId: input.sourceNodeId, targetNodeId: input.targetNodeId, relationType, confidence, provenance: normalizeJson(input.provenance), createdByUserId: userId }).onDuplicateKeyUpdate({ set: { confidence, provenance: normalizeJson(input.provenance) } });
  const [edge] = await db.select().from(knowledgeEdges).where(and(eq(knowledgeEdges.workspaceId, input.workspaceId), eq(knowledgeEdges.sourceNodeId, input.sourceNodeId), eq(knowledgeEdges.targetNodeId, input.targetNodeId), eq(knowledgeEdges.relationType, relationType))).limit(1);
  if (!edge) throw new Error("Knowledge edge tidak dapat disimpan.");
  return edge;
}

export async function traverseGraph(userId: number, input: { workspaceId: number; startNodeId: number; maxDepth?: number; limit?: number }) {
  const graph = await listGraph(userId, input.workspaceId);
  const nodeById = new Map(graph.nodes.map(node => [node.id, node]));
  const start = nodeById.get(input.startNodeId);
  if (!start) throw new Error("Start node tidak ditemukan.");
  const maxDepth = Math.min(12, Math.max(0, Math.trunc(input.maxDepth ?? 3)));
  const limit = Math.min(500, Math.max(1, Math.trunc(input.limit ?? 100)));
  const visited = new Map<number, number>([[start.id, 0]]);
  const queue = [start.id];
  while (queue.length && visited.size < limit) {
    const current = queue.shift()!;
    const depth = visited.get(current)!;
    if (depth >= maxDepth) continue;
    for (const edge of graph.edges.filter(candidate => candidate.sourceNodeId === current)) {
      if (!visited.has(edge.targetNodeId) && visited.size < limit) {
        visited.set(edge.targetNodeId, depth + 1);
        queue.push(edge.targetNodeId);
      }
    }
  }
  return { nodes: Array.from(visited.entries()).map(([id, depth]) => ({ node: nodeById.get(id)!, depth })), edges: graph.edges.filter(edge => visited.has(edge.sourceNodeId) && visited.has(edge.targetNodeId)) };
}
