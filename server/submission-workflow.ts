import { and, desc, eq } from "drizzle-orm";
import { findings, reportVersions, submissionEvents, submissions } from "../drizzle/schema";
import { getDb } from "./db";
import { canAccessWorkspace } from "./control-plane/operations";

export type SubmissionStatus = "submitted" | "acknowledged" | "triaged" | "accepted" | "rejected" | "duplicate" | "resolved" | "retest";

const transitions: Record<SubmissionStatus, SubmissionStatus[]> = {
  submitted: ["acknowledged", "rejected", "duplicate"],
  acknowledged: ["triaged", "rejected", "duplicate"],
  triaged: ["accepted", "rejected", "duplicate"],
  accepted: ["resolved", "retest"],
  rejected: ["retest"],
  duplicate: ["retest"],
  resolved: ["retest"],
  retest: ["resolved", "rejected", "accepted"],
};

async function requireSubmissionAccess(userId: number, submissionId: number, intent: "read" | "respond" = "read") {
  if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(submissionId) || submissionId < 1) throw new Error("Submission identity is invalid.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [submission] = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);
  if (!submission || !(await canAccessWorkspace(userId, submission.workspaceId, intent))) throw new Error("Submission tidak ditemukan atau tidak dapat diakses.");
  return { db, submission };
}

export async function createSubmission(userId: number, input: { findingId: number; reportVersionId: number; externalReference?: string }) {
  if (!Number.isInteger(userId) || userId < 1 || !input || !Number.isInteger(input.findingId) || input.findingId < 1 || !Number.isInteger(input.reportVersionId) || input.reportVersionId < 1 || (input.externalReference !== undefined && typeof input.externalReference !== "string")) throw new Error("Submission input is invalid.");
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [report] = await db.select().from(reportVersions).where(eq(reportVersions.id, input.reportVersionId)).limit(1);
  const [finding] = await db.select().from(findings).where(eq(findings.id, input.findingId)).limit(1);
  if (!report || !finding || report.findingId !== finding.id || report.workspaceId !== finding.workspaceId) throw new Error("Finding dan report version harus berasal dari workspace yang sama.");
  if (!(await canAccessWorkspace(userId, finding.workspaceId, "respond"))) throw new Error("Submission permission denied.");
  if (report.readyForReview !== 1 || finding.humanReviewStatus !== "approved") throw new Error("Finding must pass report readiness and human review approval before submission.");
  const externalReference = input.externalReference?.trim() || null;
  await db.insert(submissions).values({ findingId: finding.id, workspaceId: finding.workspaceId, reportVersionId: report.id, platform: report.platform, externalReference, status: "submitted", submittedByUserId: userId });
  const [submission] = await db.select().from(submissions).where(and(eq(submissions.findingId, finding.id), eq(submissions.reportVersionId, report.id))).orderBy(desc(submissions.submittedAt)).limit(1);
  if (!submission) throw new Error("Submission could not be created.");
  await db.insert(submissionEvents).values({ submissionId: submission.id, workspaceId: submission.workspaceId, fromStatus: null, toStatus: "submitted", note: externalReference ? `External reference: ${externalReference}` : null, changedByUserId: userId });
  return submission;
}

export async function listSubmissions(userId: number, workspaceId: number) {
  if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(workspaceId) || workspaceId < 1) throw new Error("Workspace identity is invalid.");
  const db = await getDb();
  if (!db || !(await canAccessWorkspace(userId, workspaceId, "read"))) return [];
  return db.select().from(submissions).where(eq(submissions.workspaceId, workspaceId)).orderBy(desc(submissions.updatedAt));
}

export async function listSubmissionEvents(userId: number, submissionId: number) {
  const { db, submission } = await requireSubmissionAccess(userId, submissionId);
  return db.select().from(submissionEvents).where(eq(submissionEvents.submissionId, submission.id)).orderBy(desc(submissionEvents.createdAt));
}

export async function transitionSubmission(userId: number, input: { submissionId: number; status: SubmissionStatus; note?: string }) {
  if (!input || !Number.isInteger(input.submissionId) || input.submissionId < 1 || !Object.prototype.hasOwnProperty.call(transitions, input.status) || (input.note !== undefined && typeof input.note !== "string")) throw new Error("Submission transition input is invalid.");
  const { db, submission } = await requireSubmissionAccess(userId, input.submissionId, "respond");
  if (!transitions[submission.status as SubmissionStatus]?.includes(input.status)) throw new Error(`Invalid submission transition: ${submission.status} -> ${input.status}`);
  await db.update(submissions).set({ status: input.status, updatedAt: new Date() }).where(eq(submissions.id, submission.id));
  await db.insert(submissionEvents).values({ submissionId: submission.id, workspaceId: submission.workspaceId, fromStatus: submission.status, toStatus: input.status, note: input.note?.trim().slice(0, 4_000) || null, changedByUserId: userId });
  return { success: true as const, submissionId: submission.id, status: input.status };
}
