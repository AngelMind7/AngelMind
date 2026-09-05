import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, lt } from "drizzle-orm";
import { getDb, getUserByEmail } from "./db";
import { organizationAuditEvents, organizationInvitations, programScopeVersions, programs, organizationMembers, organizations, workspaces } from "../drizzle/schema";
import { diffProgramScope, nextProgramScopeVersion, normalizeProgramScope, parseStoredProgramScope } from "./control-plane/program-scope";
import { buildOrganizationInvitationEmail } from "./_core/email-templates";
import { enqueueEmailDelivery } from "./email-delivery";
import { currentTraceContext } from "./_core/trace-context";

const organizationRoles = ["owner", "admin", "researcher", "reviewer", "auditor"] as const;
type OrganizationRole = (typeof organizationRoles)[number];

function slugify(value: string) {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 160);
  return slug || "organization";
}

async function requireMembership(userId: number, organizationId: number, minimum: "read" | "manage" = "read") {
  if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(organizationId) || organizationId < 1) throw new Error("Organization identity is invalid.");
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
  if (!Number.isInteger(userId) || userId < 1 || !input || typeof input.name !== "string") throw new Error("Organization input is invalid.");
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
  await db.insert(programScopeVersions).values({ programId: program.id, organizationId: program.organizationId, version: program.currentVersion, includedAssets: program.includedAssets, excludedAssets: program.excludedAssets, rules: program.rules, safeHarbor: program.safeHarbor, changedByUserId: userId, changeSummary: "Initial program scope" });
  return program;
}
export async function listProgramScopeVersions(userId: number, programId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [program] = await db.select({ id: programs.id, organizationId: programs.organizationId }).from(programs).where(eq(programs.id, programId)).limit(1);
  if (!program) throw new Error("Program tidak ditemukan.");
  await requireMembership(userId, program.organizationId);
  return db.select().from(programScopeVersions).where(eq(programScopeVersions.programId, programId)).orderBy(desc(programScopeVersions.version));
}
export async function updateProgramScope(userId: number, input: { programId: number; includedAssets: string[]; excludedAssets: string[]; rules: string[]; safeHarbor: string; changeSummary?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [program] = await db.select().from(programs).where(eq(programs.id, input.programId)).limit(1);
  if (!program) throw new Error("Program tidak ditemukan.");
  await requireMembership(userId, program.organizationId, "manage");
  const previous = parseStoredProgramScope(program);
  const { version, diff } = nextProgramScopeVersion(previous, input);
  if (!diff.changed) return { changed: false as const, programId: program.id, version: previous.version, diff };
  const current = normalizeProgramScope({ ...input, version });
  await db.update(programs).set({ includedAssets: JSON.stringify(current.includedAssets), excludedAssets: JSON.stringify(current.excludedAssets), rules: JSON.stringify(current.rules), safeHarbor: current.safeHarbor, currentVersion: current.version, updatedAt: new Date() }).where(eq(programs.id, program.id));
  await db.insert(programScopeVersions).values({ programId: program.id, organizationId: program.organizationId, version: current.version, includedAssets: JSON.stringify(current.includedAssets), excludedAssets: JSON.stringify(current.excludedAssets), rules: JSON.stringify(current.rules), safeHarbor: current.safeHarbor, changedByUserId: userId, changeSummary: input.changeSummary?.trim() || `Program scope version ${current.version}` });
  return { changed: true as const, programId: program.id, version: current.version, diff };
}
export async function previewProgramScopeChange(userId: number, input: { programId: number; includedAssets: string[]; excludedAssets: string[]; rules: string[]; safeHarbor: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [program] = await db.select().from(programs).where(eq(programs.id, input.programId)).limit(1);
  if (!program) throw new Error("Program tidak ditemukan.");
  await requireMembership(userId, program.organizationId);
  const previous = parseStoredProgramScope(program);
  const current = normalizeProgramScope({ includedAssets: input.includedAssets, excludedAssets: input.excludedAssets, rules: input.rules, safeHarbor: input.safeHarbor, version: previous.version });
  return { programId: program.id, organizationId: program.organizationId, currentVersion: previous.version, nextVersion: previous.version + (diffProgramScope(previous, current).changed ? 1 : 0), diff: diffProgramScope(previous, current) };
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

export const organizationPrivilegeMatrix = {
  owner: ["organization.manage", "members.manage", "programs.manage", "scope.manage", "abuse.review", "infrastructure.view"],
  admin: ["members.manage", "programs.manage", "scope.manage", "abuse.review", "infrastructure.view"],
  researcher: ["programs.read", "scope.read", "research.execute"],
  reviewer: ["programs.read", "scope.read", "findings.review", "evidence.review", "reports.review"],
  auditor: ["organization.read", "audit.read", "evidence.read", "infrastructure.view"],
} as const;

export async function updateOrganizationMemberRole(userId: number, input: { organizationId: number; memberId: number; role: Exclude<OrganizationRole, "owner"> }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await requireMembership(userId, input.organizationId, "manage");
  const [member] = await db.select().from(organizationMembers).where(and(eq(organizationMembers.id, input.memberId), eq(organizationMembers.organizationId, input.organizationId))).limit(1);
  if (!member) throw new Error("Organization member tidak ditemukan.");
  if (member.role === "owner") throw new Error("Owner role requires the protected ownership transfer workflow.");
  await db.update(organizationMembers).set({ role: input.role }).where(and(eq(organizationMembers.id, input.memberId), eq(organizationMembers.organizationId, input.organizationId)));
  await db.insert(organizationAuditEvents).values({ organizationId: input.organizationId, actorUserId: userId, category: "organization-membership", subject: "member-role-changed", details: JSON.stringify({ memberId: member.id, memberUserId: member.userId, previousRole: member.role, nextRole: input.role }), traceId: currentTraceContext()?.traceId ?? null });
  return { success: true as const, memberId: member.id, role: input.role };
}

export async function listOrganizationRoleAudit(userId: number, organizationId: number, limit = 50) {
  const { db } = await requireMembership(userId, organizationId);
  const rows = await db.select().from(organizationAuditEvents).where(eq(organizationAuditEvents.organizationId, organizationId)).orderBy(desc(organizationAuditEvents.createdAt)).limit(Math.min(100, Math.max(1, Math.trunc(limit))));
  return rows.filter(row => row.subject === "member-role-changed").map(row => ({ ...row, details: JSON.parse(row.details) as { memberId: number; memberUserId: number; previousRole: string; nextRole: string } }));
}

export async function listOrganizationPrivileges(userId: number, organizationId: number) {
  const { membership } = await requireMembership(userId, organizationId);
  return { organizationId, role: membership.role, privileges: [...organizationPrivilegeMatrix[membership.role]] };
}

const invitationHash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function listOrganizationInvitations(userId: number, organizationId: number) {
  const { db } = await requireMembership(userId, organizationId);
  await db.update(organizationInvitations).set({ status: "expired" }).where(and(eq(organizationInvitations.organizationId, organizationId), eq(organizationInvitations.status, "pending"), lt(organizationInvitations.expiresAt, new Date())));
  return db.select({ id: organizationInvitations.id, email: organizationInvitations.email, role: organizationInvitations.role, status: organizationInvitations.status, expiresAt: organizationInvitations.expiresAt, createdAt: organizationInvitations.createdAt }).from(organizationInvitations).where(eq(organizationInvitations.organizationId, organizationId)).orderBy(desc(organizationInvitations.createdAt));
}
export async function createOrganizationInvitation(userId: number, input: { organizationId: number; email: string; role: Exclude<OrganizationRole, "owner">; expiresInDays?: number }) {
  if (!input || !Number.isInteger(input.organizationId) || input.organizationId < 1 || typeof input.email !== "string" || !organizationRoles.includes(input.role) || (input.expiresInDays !== undefined && !Number.isFinite(input.expiresInDays))) throw new Error("Invitation input is invalid.");
  const { db } = await requireMembership(userId, input.organizationId, "manage");
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Invitation email is invalid.");
  const existing = await db.select().from(organizationInvitations).where(and(eq(organizationInvitations.organizationId, input.organizationId), eq(organizationInvitations.email, email), eq(organizationInvitations.status, "pending"))).limit(1);
  if (existing[0]) throw new Error("A pending invitation already exists for this email.");
  const token = `inv_${randomBytes(32).toString("base64url")}`;
  const expiresAt = new Date(Date.now() + Math.min(30, Math.max(1, input.expiresInDays ?? 7)) * 86_400_000);
  await db.insert(organizationInvitations).values({ organizationId: input.organizationId, email, role: input.role, tokenHash: invitationHash(token), invitedByUserId: userId, expiresAt });
  const baseUrl = (process.env.APP_BASE_URL ?? process.env.PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");
  if (baseUrl) {
    const email = buildOrganizationInvitationEmail({ organizationName: (await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, input.organizationId)).limit(1))[0]?.name ?? "AngelMind organization", inviterName: undefined, inviteUrl: `${baseUrl}/accept-invitation?token=${encodeURIComponent(token)}`, expiresAt });
    await enqueueEmailDelivery(userId, { recipient: input.email, templateKey: "organization_invitation", subject: email.subject, text: email.text, html: email.html, idempotencyKey: `organization-invitation:${input.organizationId}:${input.email.trim().toLowerCase()}:${expiresAt.getTime()}` });
  }
  return { token, expiresAt, email: input.email.trim().toLowerCase(), role: input.role };
}
export async function acceptOrganizationInvitation(userId: number, token: string) {
  if (!Number.isInteger(userId) || userId < 1 || typeof token !== "string" || token.trim().length < 16 || token.length > 512) throw new Error("Invitation acceptance input is invalid.");
  const db = await getDb(); if (!db) throw new Error("Database tidak tersedia.");
  const user = await db.select().from((await import("../drizzle/schema")).users).where(eq((await import("../drizzle/schema")).users.id, userId)).limit(1);
  const [invite] = await db.select().from(organizationInvitations).where(eq(organizationInvitations.tokenHash, invitationHash(token.trim()))).limit(1);
  if (!invite) throw new Error("Invitation tidak ditemukan.");
  if (invite.status !== "pending" || invite.expiresAt <= new Date()) { if (invite.status === "pending") await db.update(organizationInvitations).set({ status: "expired" }).where(eq(organizationInvitations.id, invite.id)); throw new Error("Invitation sudah tidak berlaku."); }
  if (!user[0]?.email || user[0].email.toLowerCase() !== invite.email) throw new Error("Invitation email does not match signed-in user.");
  await db.insert(organizationMembers).values({ organizationId: invite.organizationId, userId, role: invite.role, invitedByUserId: invite.invitedByUserId }).onDuplicateKeyUpdate({ set: { role: invite.role } });
  await db.update(organizationInvitations).set({ status: "accepted", acceptedByUserId: userId, acceptedAt: new Date() }).where(and(eq(organizationInvitations.id, invite.id), eq(organizationInvitations.status, "pending")));
  return { success: true as const, organizationId: invite.organizationId, role: invite.role };
}
export async function revokeOrganizationInvitation(userId: number, invitationId: number) { const db = await getDb(); if (!db) throw new Error("Database tidak tersedia."); const [invite] = await db.select().from(organizationInvitations).where(eq(organizationInvitations.id, invitationId)).limit(1); if (!invite) throw new Error("Invitation tidak ditemukan."); await requireMembership(userId, invite.organizationId, "manage"); await db.update(organizationInvitations).set({ status: "revoked" }).where(and(eq(organizationInvitations.id, invitationId), eq(organizationInvitations.status, "pending"))); return { success: true as const }; }
export async function resendOrganizationInvitation(userId: number, invitationId: number) { const db = await getDb(); if (!db) throw new Error("Database tidak tersedia."); const [invite] = await db.select().from(organizationInvitations).where(eq(organizationInvitations.id, invitationId)).limit(1); if (!invite) throw new Error("Invitation tidak ditemukan."); await requireMembership(userId, invite.organizationId, "manage"); await db.update(organizationInvitations).set({ status: "revoked" }).where(eq(organizationInvitations.id, invitationId)); return createOrganizationInvitation(userId, { organizationId: invite.organizationId, email: invite.email, role: invite.role }); }
