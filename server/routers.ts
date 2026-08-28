import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookie } from "cookie";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { createHeartbeatJob } from "./_core/heartbeat";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as controlPlane from "./control-plane/service";
import * as operations from "./control-plane/operations";
import * as assurance from "./control-plane/assurance";
import * as agent from "./control-plane/agent";
import { parsePassiveInventory } from "./control-plane/passive-inventory";
import { composeReport } from "./control-plane/report-composer";
import * as workflowPersistence from "./control-plane/workflow-persistence";

const workspaceInput = z.object({
  name: z.string().min(2).max(120),
  programName: z.string().min(2).max(160),
  safeHarbor: z.string().min(10).max(10_000),
  codeOfConduct: z.string().min(10).max(10_000),
  allowlist: z.array(z.string().min(1).max(255)).min(1).max(100),
  exclusions: z.array(z.string().min(1).max(255)).max(100),
  budgetCents: z.number().int().min(1).max(100_000_000),
  sessionLimitMinutes: z.number().int().min(5).max(1_440),
  cooldownMinutes: z.number().int().min(0).max(10_080),
  retentionDays: z.number().int().min(1).max(3_650),
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  agent: router({
    analyzeEvidence: protectedProcedure.input(z.object({ scopeSummary: z.string().min(20).max(10_000), evidence: z.string().min(20).max(40_000), findingTitle: z.string().max(240).optional() })).mutation(({ input }) => agent.analyzeEvidence(input)),
    analyzeAndCreateFinding: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), scopeSummary: z.string().min(20).max(10_000), evidence: z.string().min(20).max(40_000), findingTitle: z.string().min(3).max(240) })).mutation(({ ctx, input }) => agent.analyzeAndCreateFinding(ctx.user.id, input)),
    importPassiveInventory: protectedProcedure.input(z.object({ content: z.string().min(1).max(500_000), format: z.enum(["csv", "json"]), allowlist: z.array(z.string().min(1).max(255)).min(1).max(100), exclusions: z.array(z.string().min(1).max(255)).max(100) })).mutation(({ input }) => parsePassiveInventory(input)),
    composeReport: protectedProcedure.input(z.object({ platform: z.enum(["hackerone", "bugcrowd", "intigriti", "markdown"]), title: z.string().min(3).max(240), severity: z.enum(["informational", "low", "medium", "high", "critical"]), summary: z.string().max(12_000), impact: z.string().max(12_000), evidence: z.array(z.string().max(4_000)).max(100), reproductionNotes: z.array(z.string().max(4_000)).max(100), remediation: z.string().max(12_000).optional() })).mutation(({ input }) => composeReport(input, input.platform)),
    importWorkspaceInventory: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), content: z.string().min(1).max(500_000), format: z.enum(["csv", "json"]), allowlist: z.array(z.string().min(1).max(255)).min(1).max(100), exclusions: z.array(z.string().min(1).max(255)).max(100) })).mutation(({ ctx, input }) => workflowPersistence.importPassiveAssets(ctx.user.id, input)),
    listWorkspaceInventory: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(({ ctx, input }) => workflowPersistence.listPassiveAssets(ctx.user.id, input.workspaceId)),
    saveReportVersion: protectedProcedure.input(z.object({ findingId: z.number().int().positive(), workspaceId: z.number().int().positive(), platform: z.enum(["hackerone", "bugcrowd", "intigriti", "markdown"]), report: z.object({ title: z.string().min(3).max(240), severity: z.enum(["informational", "low", "medium", "high", "critical"]), summary: z.string().max(12_000), impact: z.string().max(12_000), evidence: z.array(z.string().max(4_000)).max(100), reproductionNotes: z.array(z.string().max(4_000)).max(100), remediation: z.string().max(12_000).optional() }) })).mutation(({ ctx, input }) => workflowPersistence.createReportVersion(ctx.user.id, input)),
    listReportVersions: protectedProcedure.input(z.object({ findingId: z.number().int().positive(), workspaceId: z.number().int().positive() })).query(({ ctx, input }) => workflowPersistence.listReportVersions(ctx.user.id, input.findingId, input.workspaceId)),
  }),
  control: router({
    dashboard: protectedProcedure.query(({ ctx }) => controlPlane.getDashboard(ctx.user.id)),
  }),
  notification: router({
    list: protectedProcedure.query(({ ctx }) => controlPlane.listNotifications(ctx.user.id)),
    preferences: protectedProcedure.query(({ ctx }) => controlPlane.listNotificationPreferences(ctx.user.id)),
    setPreference: protectedProcedure.input(z.object({ eventType: z.enum(["approval_required", "guardrail_blocked", "finding_validated", "scheduled_check", "policy_review_required", "incident_created", "webhook_activation_requested"]), inAppEnabled: z.boolean() })).mutation(({ ctx, input }) => controlPlane.setNotificationPreference(ctx.user.id, input.eventType, input.inAppEnabled)),
    markRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(({ ctx, input }) => controlPlane.markNotificationRead(ctx.user.id, input.notificationId)),
    markAllRead: protectedProcedure.mutation(({ ctx }) => controlPlane.markAllNotificationsRead(ctx.user.id)),
  }),
  operations: router({
    members: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(({ ctx, input }) => operations.listMembers(ctx.user.id, input.workspaceId)),
    addMember: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), email: z.string().email().max(320), role: z.enum(["operator", "reviewer", "auditor"]) })).mutation(({ ctx, input }) => operations.addMember(ctx.user.id, input)),
    removeMember: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), membershipId: z.number().int().positive() })).mutation(({ ctx, input }) => operations.removeMember(ctx.user.id, input.workspaceId, input.membershipId)),
    webhook: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(({ ctx, input }) => operations.getWebhookConfiguration(ctx.user.id, input.workspaceId)),
    saveWebhookDraft: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), endpoint: z.string().max(2_048), signingSecretReference: z.string().max(240).optional(), eventTypes: z.array(z.enum(["approval_required", "guardrail_blocked", "finding_validated", "scheduled_check", "policy_review_required", "incident_created", "webhook_activation_requested"])).min(1), endpointConfirmed: z.boolean() })).mutation(({ ctx, input }) => operations.saveWebhookDraft(ctx.user.id, input)),
    archives: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(({ ctx, input }) => operations.listAuditArchives(ctx.user.id, input.workspaceId)),
    createArchive: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive() })).mutation(({ ctx, input }) => operations.createAuditArchive(ctx.user.id, input.workspaceId)),
    verifyArchive: protectedProcedure.input(z.object({ archiveId: z.number().int().positive() })).mutation(({ ctx, input }) => operations.verifyAuditArchive(ctx.user.id, input.archiveId)),
  }),
  assurance: router({
    policies: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive().optional() }).optional()).query(({ ctx, input }) => assurance.listPolicyVersions(ctx.user.id, input?.workspaceId)),
    requestPolicy: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), safeHarbor: z.string().min(10).max(10_000), codeOfConduct: z.string().min(10).max(10_000), allowlist: z.array(z.string().min(1).max(255)).min(1).max(100), exclusions: z.array(z.string().min(1).max(255)).max(100), changeSummary: z.string().min(3).max(5_000) })).mutation(({ ctx, input }) => assurance.requestPolicyVersion(ctx.user.id, input)),
    decidePolicy: protectedProcedure.input(z.object({ policyVersionId: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), note: z.string().max(2_000) })).mutation(({ ctx, input }) => assurance.decidePolicyVersion(ctx.user.id, ctx.user.role, input.policyVersionId, input.decision, input.note)),
    incidents: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive().optional() }).optional()).query(({ ctx, input }) => assurance.listIncidents(ctx.user.id, input?.workspaceId)),
    createIncident: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), title: z.string().min(3).max(200), description: z.string().min(3).max(10_000), severity: z.enum(["low", "medium", "high", "critical"]) })).mutation(({ ctx, input }) => assurance.createIncident(ctx.user.id, input)),
    acknowledgeIncident: protectedProcedure.input(z.object({ incidentId: z.number().int().positive() })).mutation(({ ctx, input }) => assurance.acknowledgeIncident(ctx.user.id, input.incidentId)),
    resolveIncident: protectedProcedure.input(z.object({ incidentId: z.number().int().positive(), resolutionNote: z.string().max(5_000) })).mutation(({ ctx, input }) => assurance.resolveIncident(ctx.user.id, input.incidentId, input.resolutionNote)),
    incidentEvidence: protectedProcedure.input(z.object({ incidentId: z.number().int().positive() })).query(({ ctx, input }) => assurance.listIncidentEvidence(ctx.user.id, input.incidentId)),
    linkIncidentEvidence: protectedProcedure.input(z.object({ incidentId: z.number().int().positive(), evidenceArtifactId: z.number().int().positive() })).mutation(({ ctx, input }) => assurance.linkIncidentEvidence(ctx.user.id, input.incidentId, input.evidenceArtifactId)),
    webhookActivationRequests: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive().optional() }).optional()).query(({ ctx, input }) => assurance.listWebhookActivationRequests(ctx.user.id, input?.workspaceId)),
    requestWebhookActivation: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive() })).mutation(({ ctx, input }) => assurance.requestWebhookActivation(ctx.user.id, input.workspaceId)),
    decideWebhookActivation: protectedProcedure.input(z.object({ requestId: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), note: z.string().max(2_000) })).mutation(({ ctx, input }) => assurance.decideWebhookActivation(ctx.user.id, ctx.user.role, input.requestId, input.decision, input.note)),
  }),
  workspace: router({
    list: protectedProcedure.query(({ ctx }) => controlPlane.listWorkspaces(ctx.user.id)),
    create: protectedProcedure.input(workspaceInput).mutation(({ ctx, input }) => controlPlane.createWorkspace(ctx.user.id, input)),
    setStatus: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), status: z.enum(["active", "paused", "archived"]) })).mutation(({ ctx, input }) => controlPlane.setWorkspaceStatus(ctx.user.id, input.workspaceId, input.status)),
    credentials: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(({ ctx, input }) => controlPlane.listCredentialReferences(ctx.user.id, input.workspaceId)),
    addCredentialReference: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), label: z.string().min(2).max(120), secretReference: z.string().min(20).max(200) })).mutation(({ ctx, input }) => controlPlane.addCredentialReference(ctx.user.id, input.workspaceId, input.label, input.secretReference)),
    scheduleAdministrativeCheck: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), cron: z.string().regex(/^0\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+$/, "Gunakan cron UTC enam kolom dengan detik bernilai 0.") })).mutation(async ({ ctx, input }) => {
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      const job = await createHeartbeatJob({
        name: `angelmind-workspace-${input.workspaceId}`,
        cron: input.cron,
        path: "/api/scheduled/workspace-maintenance",
        description: `Administrative and stored-metadata change check for workspace ${input.workspaceId}`,
      }, sessionToken);
      await controlPlane.attachScheduleTask(ctx.user.id, input.workspaceId, job.taskUid);
      return job;
    }),
  }),
  rehearsal: router({
    run: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive() })).mutation(({ ctx, input }) => controlPlane.rehearseWorkspace(ctx.user.id, input.workspaceId)),
    listRuns: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive().optional() }).optional()).query(({ ctx, input }) => controlPlane.listRuns(ctx.user.id, input?.workspaceId)),
  }),
  governance: router({
    list: protectedProcedure.query(({ ctx }) => controlPlane.listApprovals(ctx.user.id, ctx.user.role)),
    requestTier3: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), action: z.literal("privileged_proof") })).mutation(({ ctx, input }) => controlPlane.requestApproval(ctx.user.id, input.workspaceId, input.action)),
    decide: protectedProcedure.input(z.object({ approvalId: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), note: z.string().max(2_000) })).mutation(({ ctx, input }) => controlPlane.decideApproval(ctx.user.id, ctx.user.role, input.approvalId, input.decision, input.note)),
  }),
  finding: router({
    list: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive().optional() }).optional()).query(({ ctx, input }) => controlPlane.listFindings(ctx.user.id, input?.workspaceId)),
    create: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), fingerprint: z.string().min(8).max(96), title: z.string().min(3).max(240), impactSummary: z.string().min(10).max(12_000), reportDraft: z.string().min(10).max(20_000), confidence: z.number().int().min(0).max(100) })).mutation(({ ctx, input }) => controlPlane.createFinding(ctx.user.id, input)),
    transition: protectedProcedure.input(z.object({ findingId: z.number().int().positive(), status: z.enum(["triaged", "candidate", "reproducing", "validated", "reported", "invalid", "duplicate", "inconclusive"]) })).mutation(({ ctx, input }) => controlPlane.transitionFinding(ctx.user.id, input)),
    approveReview: protectedProcedure.input(z.object({ findingId: z.number().int().positive() })).mutation(({ ctx, input }) => controlPlane.approveFindingReview(ctx.user.id, input.findingId)),
  }),
  audit: router({
    list: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(({ ctx, input }) => controlPlane.listAudit(ctx.user.id, input.workspaceId)),
    evidence: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(({ ctx, input }) => controlPlane.listEvidence(ctx.user.id, input.workspaceId)),
    uploadEvidence: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), findingId: z.number().int().positive().optional(), fileName: z.string().min(1).max(120), contentType: z.string().min(3).max(100), contentBase64: z.string().min(4).max(7_000_000) })).mutation(({ ctx, input }) => controlPlane.uploadEvidence(ctx.user.id, input)),
  }),
});

export type AppRouter = typeof appRouter;
