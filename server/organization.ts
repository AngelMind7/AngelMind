import { and, asc, desc, eq } from "drizzle-orm";
import { getDb, getUserByEmail } from "./db";
import { programs, organizationMembers, organizations, workspaces } from "../drizzle/schema";
import { normalizeProgramScope } from "./control-plane/program-scope";

const organizationRoles = ["owner", "admin", "researcher", "reviewer", "auditor"] as const;
type OrganizationRole = (typeof organizationRoles)[number];

function slugify(value: string) {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 160);
  return slug || "organization";
}

async function requireMembership(userId: number, organizationId: number, minimum: "read" | "manage" = "read") {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [membership] = await db.select().from(organizationMembers).where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId))).limit(1);
  if (!membership) throw new Error("Organization tidak ditemukan atau user bukan member.");
  if (minimum === "manage" && membership.role !== "owner" && membership.role !== "admin") throw new Error("Organization admin permission is required.");
  const [organization] = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  if (!organization || organization.status !== "active") throw new Error("Organization tidak aktif.");
  return { db, organization, membership };
}

export async function listOrganizations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: organizations.id, name: organizations.name, slug: organizations.slug, status: organizations.status, role: organizationMembers.role, createdAt: organizations.createdAt, updatedAt: organizations.updatedAt }).from(organizationMembers).innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id)).where(and(eq(organizationMembers.userId, userId), eq(organizations.status, "active"))).orderBy(desc(organizations.updatedAt));
}

export async function createOrganization(userId: number, input: { name: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Organization name is required.");
  const slug = `${slugify(name)}-${userId}`;
  await db.insert(organizations).values({ ownerUserId: userId, name, slug, status: "active", settings: JSON.stringify({ timezone: "UTC", defaultRole: "researcher" }) });
  const [organization] = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
  if (!organization) throw new Error("Organization could not be created.");
  await db.insert(organizationMembers).values({ organizationId: organization.id, userId, role: "owner", invitedByUserId: userId });
  return organization;
}

export async function listOrganizationMembers(userId: number, organizationId: number) {
  const { db } = await requireMembership(userId, organizationId);
  return db.select({ id: organizationMembers.id, userId: organizationMembers.userId, role: organizationMembers.role, createdAt: organizationMembers.createdAt }).from(organizationMembers).where(eq(organizationMembers.organizationId, organizationId)).orderBy(asc(organizationMembers.createdAt));
}

export async function addOrganizationMember(userId: number, input: { organizationId: number; email: string; role: OrganizationRole }) {
  const { db } = await requireMembership(userId, input.organizationId, "manage");
  const member = await getUserByEmail(input.email);
  if (!member) throw new Error("User harus login sekali terlebih dahulu agar dapat diundang melalui email.");
  if (input.role === "owner") throw new Error("Owner transfer requires an explicit account transfer workflow.");
  await db.insert(organizationMembers).values({ organizationId: input.organizationId, userId: member.id, role: input.role, invitedByUserId: userId }).onDuplicateKeyUpdate({ set: { role: input.role } });
  return { success: true as const, userId: member.id, role: input.role };
}

export async function listPrograms(userId: number, organizationId: number) {
  const { db } = await requireMembership(userId, organizationId);
  return db.select().from(programs).where(eq(programs.organizationId, organizationId)).orderBy(desc(programs.updatedAt));
}

export async function createProgram(userId: number, input: { organizationId: number; name: string; description: string; includedAssets: string[]; excludedAssets: string[]; rules: string[]; safeHarbor: string }) {
  const { db } = await requireMembership(userId, input.organizationId, "manage");
  const name = input.name.trim();
  if (name.length < 3) throw new Error("Program name is required.");
  const scope = normalizeProgramScope({ includedAssets: input.includedAssets, excludedAssets: input.excludedAssets, rules: input.rules, safeHarbor: input.safeHarbor });
  await db.insert(programs).values({ organizationId: input.organizationId, createdByUserId: userId, name, description: input.description.trim(), status: "draft", includedAssets: JSON.stringify(scope.includedAssets), excludedAssets: JSON.stringify(scope.excludedAssets), rules: JSON.stringify(scope.rules), safeHarbor: scope.safeHarbor, currentVersion: scope.version });
  const [program] = await db.select().from(programs).where(and(eq(programs.organizationId, input.organizationId), eq(programs.name, name))).limit(1);
  if (!program) throw new Error("Program could not be created.");
  return program;
}

export async function setProgramStatus(userId: number, programId: number, status: "draft" | "active" | "paused" | "completed" | "archived") {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [program] = await db.select().from(programs).where(eq(programs.id, programId)).limit(1);
  if (!program) throw new Error("Program tidak ditemukan.");
  await requireMembership(userId, program.organizationId, "manage");
  await db.update(programs).set({ status, updatedAt: new Date() }).where(eq(programs.id, programId));
  return { success: true as const, programId, status };
}

export async function linkWorkspaceToProgram(userId: number, input: { workspaceId: number; organizationId: number; programId: number }) {
  const { db } = await requireMembership(userId, input.organizationId, "manage");
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, input.workspaceId)).limit(1);
  const [program] = await db.select().from(programs).where(and(eq(programs.id, input.programId), eq(programs.organizationId, input.organizationId))).limit(1);
  if (!workspace || !program) throw new Error("Workspace atau program tidak ditemukan pada tenant yang sama.");
  if (workspace.ownerUserId !== userId) throw new Error("Only the workspace owner can link this workspace.");
  await db.update(workspaces).set({ organizationId: input.organizationId, programId: input.programId, programName: program.name, safeHarbor: program.safeHarbor, allowlist: program.includedAssets, exclusions: program.excludedAssets, updatedAt: new Date() }).where(eq(workspaces.id, input.workspaceId));
  return { success: true as const, workspaceId: input.workspaceId, organizationId: input.organizationId, programId: input.programId };
}
