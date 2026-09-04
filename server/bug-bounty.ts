import { z } from "zod";

// Domain 09: Program Management, Researcher Onboarding, Submission Portal, Reward System,
// Leaderboard, Coordinated Disclosure, Legal, and Hall of Fame.
// Safety: bounty submissions are governed records; no unrestricted target execution is performed here.

export const bountyProgramSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(4000).default(""),
  scope: z.array(z.string().min(1).max(500)).min(1),
  exclusions: z.array(z.string().min(1).max(500)).default([]),
  rewardTiers: z.array(z.object({ severity: z.enum(["low", "medium", "high", "critical"]), amount: z.number().nonnegative() })).min(1),
  safeHarbor: z.string().min(1).max(8000),
});
export type BountyProgram = z.infer<typeof bountyProgramSchema> & { id: string; status: "draft" | "active" | "paused" | "closed" };
export type ResearcherProfile = { id: string; displayName: string; verificationStatus: "unverified" | "verified" | "rejected"; skills: string[]; ndaStatus: "not_required" | "pending" | "accepted" };
export type Submission = { id: string; programId: string; researcherId: string; title: string; summary: string; severity: "low" | "medium" | "high" | "critical"; status: "submitted" | "triage" | "validated" | "duplicate" | "informative" | "resolved" | "rejected"; submittedAt: string; validationNote?: string };
export type Reward = { id: string; submissionId: string; researcherId: string; amount: number; tier: string; bonus: number; status: "calculated" | "approved" | "paid" };
export type Disclosure = { id: string; submissionId: string; status: "draft" | "researcher_approved" | "vendor_notified" | "coordinated" | "published"; cveRequested: boolean; timeline: Array<{ event: string; at: string }> };

const programs = new Map<string, BountyProgram>();
const researchers = new Map<string, ResearcherProfile>();
const submissions = new Map<string, Submission>();
const rewards = new Map<string, Reward>();
const disclosures = new Map<string, Disclosure>();
const legalDocs = new Map<string, { id: string; programId: string; safeHarbor: string; terms: string; liabilityWaiver: string }>();
const hallOfFame: Array<{ id: string; researcherId: string; submissionId: string; publishedAt: string }> = [];

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export function createBountyProgram(input: unknown) {
  const parsed = bountyProgramSchema.parse(input);
  const program: BountyProgram = { ...parsed, id: id(), status: "draft" };
  programs.set(program.id, program);
  legalDocs.set(program.id, { id: id(), programId: program.id, safeHarbor: program.safeHarbor, terms: "Program terms are binding only within the published scope.", liabilityWaiver: "No waiver applies outside authorized program scope." });
  return program;
}
export function listBountyPrograms() { return [...programs.values()]; }
export function getBountyProgram(programId: string) { const p = programs.get(programId); if (!p) throw new Error("Bug bounty program not found"); return p; }
export function registerResearcher(input: Omit<ResearcherProfile, "id">) { const researcher = { ...input, id: id() }; researchers.set(researcher.id, researcher); return researcher; }
export function getResearcher(id_: string) { const r = researchers.get(id_); if (!r) throw new Error("Researcher not found"); return r; }
export function submitBountyReport(input: Omit<Submission, "id" | "status" | "submittedAt">) {
  const program = getBountyProgram(input.programId); if (program.status !== "active") throw new Error("Program is not accepting submissions");
  const researcher = getResearcher(input.researcherId); if (researcher.verificationStatus !== "verified") throw new Error("Researcher verification required");
  const submission: Submission = { ...input, id: id(), status: "submitted", submittedAt: now() }; submissions.set(submission.id, submission); return submission;
}
export function listBountySubmissions(programId?: string) { return [...submissions.values()].filter(s => !programId || s.programId === programId); }
export function getBountySubmission(submissionId: string) { const s = submissions.get(submissionId); if (!s) throw new Error("Submission not found"); return s; }
export function validateBountySubmission(submissionId: string, validationNote = "Validated against the published program scope.") {
  const s = getBountySubmission(submissionId); if (s.status !== "submitted" && s.status !== "triage") throw new Error("Submission is not awaiting validation");
  s.status = "validated"; s.validationNote = validationNote; return s;
}
export function calculateBountyPayout(submissionId: string) {
  const s = getBountySubmission(submissionId); if (s.status !== "validated") throw new Error("Submission must be validated before payout");
  const program = getBountyProgram(s.programId); const tier = program.rewardTiers.find(t => t.severity === s.severity) ?? program.rewardTiers[0];
  const reward: Reward = { id: id(), submissionId: s.id, researcherId: s.researcherId, amount: tier.amount, tier: tier.severity, bonus: 0, status: "approved" }; rewards.set(reward.id, reward); return reward;
}
export function publishDisclosure(submissionId: string, cveRequested = false) {
  const s = getBountySubmission(submissionId); if (s.status !== "validated" && s.status !== "resolved") throw new Error("Submission must be validated before disclosure");
  const disclosure: Disclosure = { id: id(), submissionId, status: "draft", cveRequested, timeline: [{ event: "created", at: now() }] }; disclosures.set(disclosure.id, disclosure); return disclosure;
}
export function listLeaderboard() {
  const totals = new Map<string, { researcherId: string; validated: number; bounty: number }>();
  for (const s of submissions.values()) if (s.status === "validated" || s.status === "resolved") { const x = totals.get(s.researcherId) ?? { researcherId: s.researcherId, validated: 0, bounty: 0 }; x.validated++; totals.set(s.researcherId, x); }
  for (const r of rewards.values()) { const x = totals.get(r.researcherId) ?? { researcherId: r.researcherId, validated: 0, bounty: 0 }; x.bounty += r.amount + r.bonus; totals.set(r.researcherId, x); }
  return [...totals.values()].sort((a, b) => b.validated - a.validated || b.bounty - a.bounty).map((x, i) => ({ rank: i + 1, ...x, reputation: x.validated * 100 + x.bounty }));
}
export function listDisclosure(submissionId?: string) { return [...disclosures.values()].filter(d => !submissionId || d.submissionId === submissionId); }
export function listLegalDocs(programId?: string) { return [...legalDocs.values()].filter(d => !programId || d.programId === programId); }
export function listHallOfFame() { return hallOfFame; }
