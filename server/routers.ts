import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "./_core/trpc";
import * as controlPlane from "./control-plane/service";
import { isTargetInScope } from "./control-plane/guardrails";
import * as operations from "./control-plane/operations";
import * as assurance from "./control-plane/assurance";
import * as agent from "./control-plane/agent";
import { composeReport } from "./control-plane/report-composer";
import * as workflowPersistence from "./control-plane/workflow-persistence";
import { validateReportInput } from "./control-plane/report-validation";
import { extractArtifact } from "./control-plane/artifact-extraction";
import * as analytics from "./control-plane/analytics";
import * as collaboration from "./control-plane/collaboration";
import * as accountSecurity from "./account-security";
import * as researchWorkflow from "./research-workflow";
import * as organization from "./organization";
import * as evidenceWorkflow from "./evidence-workflow";
import * as aiPlatform from "./ai-platform";
import * as aiOrchestration from "./ai-orchestration";
import * as securityPlatform from "./security-platform";
import * as submissionWorkflow from "./submission-workflow";
import * as globalSearch from "./global-search";
import * as savedViewService from "./saved-views";
import * as tagsNotes from "./tags-notes";
import * as profile from "./profile";
import * as researchIntelligence from "./research-intelligence";
import * as toolCatalog from "./tool-catalog";
import * as toolRuntime from "./tool-runtime";
import * as knowledgeGraph from "./knowledge-graph";

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
    apiKeys: protectedProcedure.query(({ ctx }) =>
      securityPlatform.listApiKeys(ctx.user.id)
    ),
    apiKeysPage: protectedProcedure
      .input(z.object({ pageSize: z.number().int().min(1).max(100).optional(), cursor: z.string().max(512).optional() }))
      .query(({ ctx, input }) => securityPlatform.listApiKeysPage(ctx.user.id, input)),
    createApiKey: protectedProcedure
      .input(
        z.object({
          name: z.string().min(3).max(120),
          workspaceId: z.number().int().positive().optional(),
          scopes: z.array(z.string().trim().min(1).max(80)).min(1).max(50),
          expiresAt: z.coerce.date().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        securityPlatform.createApiKey(ctx.user.id, input)
      ),
    rotateApiKey: protectedProcedure
      .input(
        z.object({
          apiKeyId: z.number().int().positive(),
          expiresAt: z.coerce.date().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        securityPlatform.rotateApiKey(
          ctx.user.id,
          input.apiKeyId,
          input.expiresAt
        )
      ),
    revokeApiKey: protectedProcedure
      .input(z.object({ apiKeyId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        securityPlatform.revokeApiKey(ctx.user.id, input.apiKeyId)
      ),
    privacyRequests: protectedProcedure.query(({ ctx }) =>
      securityPlatform.listPrivacyRequests(ctx.user.id)
    ),
    privacyRequestsPage: protectedProcedure
      .input(z.object({ pageSize: z.number().int().min(1).max(100).optional(), cursor: z.string().max(512).optional() }))
      .query(({ ctx, input }) => securityPlatform.listPrivacyRequestsPage(ctx.user.id, input)),
    downloadPrivacyExport: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        securityPlatform.getPrivacyExportDownloadUrl(ctx.user.id, input.requestId)
      ),
    profile: protectedProcedure.query(({ ctx }) =>
      profile.getUserProfile(ctx.user.id)
    ),
    updateProfile: protectedProcedure
      .input(
        z.object({
          username: z.string().max(64).optional(),
          avatarReference: z.string().max(512).optional(),
          bio: z.string().max(4_000),
          specialization: z.string().max(160).optional(),
          skills: z.array(z.string().min(1).max(120)).max(100),
          experience: z.array(z.string().min(1).max(240)).max(100),
          visibility: z.enum(["private", "organization", "public"]),
        })
      )
      .mutation(({ ctx, input }) =>
        profile.updateUserProfile(ctx.user.id, input)
      ),
    requestPrivacyAction: protectedProcedure
      .input(
        z.object({
          requestType: z.enum(["export", "delete", "rectify"]),
          reason: z.string().min(3).max(20_000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const request = await securityPlatform.requestPrivacyAction(ctx.user.id, input);
        if (request && (input.requestType === "export" || input.requestType === "delete")) {
          await aiPlatform.enqueueJob(ctx.user.id, {
            kind: "privacy.process",
            idempotencyKey: `privacy:${request.id}`,
            payload: { type: "privacy_process", requestId: request.id, userId: ctx.user.id },
            maxAttempts: 3,
          });
        }
        return request;
      }),
    processPrivacyRequest: adminProcedure
      .input(
        z.object({
          requestId: z.number().int().positive(),
          status: z.enum(["processing", "completed", "rejected"]),
          resultReference: z.string().trim().max(512).optional(),
        })
      )
      .mutation(({ input }) => securityPlatform.processPrivacyRequest(input)),
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      if (ctx.user) void accountSecurity.recordAuthEvent(ctx.user.id, "logout");
      return { success: true, provider: "firebase" } as const;
    }),
    security: protectedProcedure.query(({ ctx }) =>
      accountSecurity.getAccountSecurity(ctx.user.id)
    ),
    registerDevice: protectedProcedure
      .input(
        z.object({
          fingerprint: z.string().min(16).max(512),
          label: z.string().max(120).optional(),
          platform: z.enum(["web", "ios", "android", "unknown"]).optional(),
          userAgent: z.string().max(512).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        accountSecurity.registerAuthDevice(ctx.user.id, input)
      ),
    revokeDevice: protectedProcedure
      .input(z.object({ deviceId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        accountSecurity.revokeAuthDevice(ctx.user.id, input.deviceId)
      ),
    onboarding: protectedProcedure.mutation(({ ctx }) =>
      accountSecurity
        .getAccountSecurity(ctx.user.id)
        .then(result => result.profile)
    ),
    saveOnboarding: protectedProcedure
      .input(
        z.object({
          status: z.enum([
            "not_started",
            "in_progress",
            "completed",
            "skipped",
          ]),
          currentStep: z.enum([
            "profile",
            "organization",
            "workspace",
            "complete",
          ]),
          organizationName: z.string().max(160).optional(),
          roleIntent: z.string().max(80).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        accountSecurity.saveOnboardingProfile(ctx.user.id, input)
      ),
  }),
  agent: router({
    planMultiAgentRun: protectedProcedure
      .input(
        z.object({
          objective: z.string().trim().min(10).max(10_000),
          roles: z
            .array(z.enum(["scope", "evidence", "risk", "report"]))
            .min(1)
            .max(4),
          evidenceReferences: z
            .array(z.string().trim().min(1).max(512))
            .max(100)
            .optional(),
        })
      )
      .mutation(({ input }) => aiOrchestration.planMultiAgentRun(input)),
    selectModel: protectedProcedure
      .input(
        z.object({
          capabilities: z
            .array(z.string().trim().min(1).max(80))
            .max(30)
            .optional(),
          minimumContextWindow: z
            .number()
            .int()
            .min(0)
            .max(10_000_000)
            .optional(),
          maxCostCentsPerMillionTokens: z
            .number()
            .int()
            .min(0)
            .max(10_000_000)
            .optional(),
          allowDegraded: z.boolean().optional(),
        })
      )
      .query(({ input }) => aiPlatform.selectRegisteredModel(input)),
    enqueuePlan: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          objective: z.string().trim().min(10).max(10_000),
          roles: z
            .array(z.enum(["scope", "evidence", "risk", "report"]))
            .min(1)
            .max(4),
          evidenceReferences: z
            .array(z.string().trim().min(1).max(512))
            .max(100)
            .optional(),
          idempotencyKey: z.string().trim().min(8).max(180),
        })
      )
      .mutation(({ ctx, input }) =>
        aiPlatform.enqueueOrchestrationPlan(ctx.user.id, input)
      ),
    startDurableRun: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          sessionId: z.number().int().positive().optional(),
          taskId: z.number().int().positive().optional(),
          modelKey: z.string().trim().min(2).max(160).optional(),
          capabilities: z
            .array(z.string().trim().min(1).max(80))
            .max(30)
            .optional(),
          minimumContextWindow: z
            .number()
            .int()
            .min(0)
            .max(10_000_000)
            .optional(),
          maxCostCentsPerMillionTokens: z
            .number()
            .int()
            .min(0)
            .max(10_000_000)
            .optional(),
          allowDegraded: z.boolean().optional(),
          purpose: z.string().trim().min(2).max(120),
          inputReference: z.string().trim().min(1).max(512),
          messages: z
            .array(
              z.object({
                role: z.enum(["system", "user", "assistant"]),
                content: z.string().max(100_000),
              })
            )
            .min(1)
            .max(50),
          estimatedCostCents: z
            .number()
            .int()
            .min(0)
            .max(100_000_000)
            .optional(),
          retentionDays: z.number().int().min(1).max(3_650).optional(),
          idempotencyKey: z.string().trim().min(8).max(180),
        })
      )
      .mutation(({ ctx, input }) =>
        aiPlatform.startDurableAiRun(ctx.user.id, input)
      ),
    getRunOutput: protectedProcedure
      .input(z.object({ runId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        aiPlatform.getAiRunOutput(ctx.user.id, input.runId)
      ),
    rebuildSearchIndex: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        globalSearch.rebuildWorkspaceSearchIndex(ctx.user.id, input.workspaceId)
      ),
    crossCheck: protectedProcedure
      .input(
        z.object({
          observations: z
            .array(
              z.object({
                taskId: z.string().min(1).max(120),
                role: z.enum(["scope", "evidence", "risk", "report"]),
                conclusion: z.string().min(1).max(10_000),
                confidence: z.number().min(0).max(1),
                evidenceReferences: z.array(z.string().max(512)).max(100),
              })
            )
            .min(1)
            .max(50),
        })
      )
      .mutation(({ input }) =>
        aiOrchestration.crossCheckObservations(input.observations)
      ),
    synthesize: protectedProcedure
      .input(
        z.object({
          observations: z
            .array(
              z.object({
                taskId: z.string().min(1).max(120),
                role: z.enum(["scope", "evidence", "risk", "report"]),
                conclusion: z.string().min(1).max(10_000),
                confidence: z.number().min(0).max(1),
                evidenceReferences: z.array(z.string().max(512)).max(100),
              })
            )
            .max(50),
          minimumConfidence: z.number().min(0).max(1).optional(),
        })
      )
      .mutation(({ input }) =>
        aiOrchestration.synthesizeObservations(
          input.observations,
          input.minimumConfidence
        )
      ),
    analyzeEvidence: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          scopeSummary: z.string().min(20).max(10_000),
          evidence: z.string().min(20).max(40_000),
          findingTitle: z.string().max(240).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        agent.analyzeEvidenceForWorkspace(ctx.user.id, input)
      ),
    analyzeAndCreateFinding: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          scopeSummary: z.string().min(20).max(10_000),
          evidence: z.string().min(20).max(40_000),
          findingTitle: z.string().min(3).max(240),
        })
      )
      .mutation(({ ctx, input }) =>
        agent.analyzeAndCreateFinding(ctx.user.id, input)
      ),
    composeReport: protectedProcedure
      .input(
        z.object({
          platform: z.enum(["hackerone", "bugcrowd", "intigriti", "markdown"]),
          title: z.string().min(3).max(240),
          severity: z.enum([
            "informational",
            "low",
            "medium",
            "high",
            "critical",
          ]),
          summary: z.string().max(12_000),
          impact: z.string().max(12_000),
          evidence: z.array(z.string().max(4_000)).max(100),
          reproductionNotes: z.array(z.string().max(4_000)).max(100),
          remediation: z.string().max(12_000).optional(),
        })
      )
      .mutation(({ input }) => composeReport(input, input.platform)),
    importWorkspaceInventory: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          content: z.string().min(1).max(500_000),
          format: z.enum(["csv", "json"]),
          allowlist: z.array(z.string().min(1).max(255)).min(1).max(100),
          exclusions: z.array(z.string().min(1).max(255)).max(100),
        })
      )
      .mutation(({ ctx, input }) =>
        workflowPersistence.importPassiveAssets(ctx.user.id, input)
      ),
    listWorkspaceInventory: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        workflowPersistence.listPassiveAssets(ctx.user.id, input.workspaceId)
      ),
    validateReport: protectedProcedure
      .input(
        z.object({
          scopeSummary: z.string().max(10_000).optional(),
          report: z.object({
            title: z.string(),
            severity: z.enum([
              "informational",
              "low",
              "medium",
              "high",
              "critical",
            ]),
            summary: z.string(),
            impact: z.string(),
            evidence: z.array(z.string()),
            reproductionNotes: z.array(z.string()),
            remediation: z.string().optional(),
          }),
        })
      )
      .mutation(({ input }) =>
        validateReportInput(input.report, input.scopeSummary ?? "")
      ),
    extractArtifact: protectedProcedure
      .input(
        z.object({
          contentBase64: z.string().min(1).max(2_800_000),
          contentType: z.string().min(1).max(120),
        })
      )
      .mutation(({ input }) => extractArtifact(input)),
    analytics: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          days: z.number().int().min(1).max(90).optional(),
        })
      )
      .query(({ ctx, input }) =>
        analytics.getWorkspaceAnalytics(
          ctx.user.id,
          input.workspaceId,
          input.days
        )
      ),
    saveReportDraft: protectedProcedure
      .input(
        z.object({
          findingId: z.number().int().positive(),
          workspaceId: z.number().int().positive(),
          platform: z.enum(["hackerone", "bugcrowd", "intigriti", "markdown"]),
          report: z.object({
            title: z.string().max(240),
            severity: z.enum([
              "informational",
              "low",
              "medium",
              "high",
              "critical",
            ]),
            summary: z.string().max(12_000),
            impact: z.string().max(12_000),
            evidence: z.array(z.string().max(4_000)).max(100),
            reproductionNotes: z.array(z.string().max(4_000)).max(100),
            remediation: z.string().max(12_000).optional(),
          }),
        })
      )
      .mutation(({ ctx, input }) =>
        workflowPersistence.saveReportDraft(ctx.user.id, input)
      ),
    getReportDraft: protectedProcedure
      .input(
        z.object({
          findingId: z.number().int().positive(),
          workspaceId: z.number().int().positive(),
        })
      )
      .query(({ ctx, input }) =>
        workflowPersistence.getReportDraft(
          ctx.user.id,
          input.findingId,
          input.workspaceId
        )
      ),
    saveReportVersion: protectedProcedure
      .input(
        z.object({
          findingId: z.number().int().positive(),
          workspaceId: z.number().int().positive(),
          platform: z.enum(["hackerone", "bugcrowd", "intigriti", "markdown"]),
          report: z.object({
            title: z.string().min(3).max(240),
            severity: z.enum([
              "informational",
              "low",
              "medium",
              "high",
              "critical",
            ]),
            summary: z.string().max(12_000),
            impact: z.string().max(12_000),
            evidence: z.array(z.string().max(4_000)).max(100),
            reproductionNotes: z.array(z.string().max(4_000)).max(100),
            remediation: z.string().max(12_000).optional(),
          }),
        })
      )
      .mutation(({ ctx, input }) =>
        workflowPersistence.createReportVersion(ctx.user.id, input)
      ),
    listReportVersions: protectedProcedure
      .input(
        z.object({
          findingId: z.number().int().positive(),
          workspaceId: z.number().int().positive(),
        })
      )
      .query(({ ctx, input }) =>
        workflowPersistence.listReportVersions(
          ctx.user.id,
          input.findingId,
          input.workspaceId
        )
      ),
    compareReportVersions: protectedProcedure
      .input(
        z.object({
          findingId: z.number().int().positive(),
          workspaceId: z.number().int().positive(),
          fromVersionId: z.number().int().positive(),
          toVersionId: z.number().int().positive(),
        })
      )
      .query(({ ctx, input }) =>
        workflowPersistence.compareReportVersions(ctx.user.id, input)
      ),
  }),
  tools: router({
    catalog: protectedProcedure
      .input(
        z
          .object({
            category: z.string().trim().min(1).max(120).optional(),
            disposition: z
              .enum([
                "candidate_offline_or_artifact",
                "candidate_passive_review",
                "disabled_high_risk",
                "disabled_review_required",
              ])
              .optional(),
            riskClass: z
              .enum(["low", "medium", "high", "critical", "unknown"])
              .optional(),
          })
          .optional()
      )
      .query(({ input }) => toolCatalog.listToolCatalog(input)),
    search: protectedProcedure
      .input(z.object({ query: z.string().trim().min(1).max(120) }))
      .query(({ input }) => toolCatalog.searchToolCatalog(input.query)),
    summary: protectedProcedure.query(() =>
      toolCatalog.getToolCatalogSummary()
    ),
    runtimeAdapters: protectedProcedure.query(() =>
      toolRuntime.listRegisteredAdapters()
    ),
    runtimeHealth: protectedProcedure.query(() =>
      toolRuntime.checkRegisteredAdapterHealth()
    ),
    run: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          target: z.string().trim().min(1).max(255).optional(),
          toolKey: z.string().trim().min(1).max(160),
          mode: z.enum(["offline_artifact", "passive_readonly"]),
          humanApproval: z.boolean(),
          input: z.string().max(2_000_000),
          timeoutMs: z.number().int().min(1_000).max(120_000).optional(),
          maxOutputBytes: z.number().int().min(1_024).max(2_000_000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const context = await controlPlane.getToolExecutionContext(
          ctx.user.id,
          input.workspaceId
        );
        if (!context.allowed) {
          return {
            requestId: "",
            toolKey: input.toolKey,
            status: "blocked" as const,
            exitCode: null,
            stdout: "",
            stderr: "",
            durationMs: 0,
            reason: context.reason,
          };
        }
        if (
          toolRuntime.adapterRequiresTargetScope(input.toolKey) &&
          (!input.target ||
            !isTargetInScope(
              input.target,
              context.allowlist,
              context.exclusions
            ) ||
            input.input.trim().toLowerCase() !== input.target.toLowerCase())
        ) {
          return {
            requestId: "",
            toolKey: input.toolKey,
            status: "blocked" as const,
            exitCode: null,
            stdout: "",
            stderr: "",
            durationMs: 0,
            reason: "target_required_or_out_of_scope",
          };
        }
        return toolRuntime.runRegisteredTool({
          ...input,
          scopeValidated: true,
        });
      }),
  }),
  control: router({
    dashboard: protectedProcedure.query(({ ctx }) =>
      controlPlane.getDashboard(ctx.user.id)
    ),
  }),
  notification: router({
    list: protectedProcedure.query(({ ctx }) =>
      controlPlane.listNotifications(ctx.user.id)
    ),
    listSince: protectedProcedure
      .input(
        z.object({
          afterId: z.number().int().positive().optional(),
          limit: z.number().int().min(1).max(100).optional(),
        })
      )
      .query(({ ctx, input }) =>
        controlPlane.listNotificationsSince(ctx.user.id, input)
      ),
    deliveryLedger: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
      .query(({ ctx, input }) => controlPlane.listNotificationDeliveries(ctx.user.id, input?.limit)),
    preferences: protectedProcedure.query(({ ctx }) =>
      controlPlane.listNotificationPreferences(ctx.user.id)
    ),
    setPreference: protectedProcedure
      .input(
        z.object({
          eventType: z.enum([
            "approval_required",
            "guardrail_blocked",
            "finding_validated",
            "scheduled_check",
            "policy_review_required",
            "incident_created",
            "webhook_activation_requested",
            "comment_mentioned",
          ]),
          inAppEnabled: z.boolean(),
        })
      )
      .mutation(({ ctx, input }) =>
        controlPlane.setNotificationPreference(
          ctx.user.id,
          input.eventType,
          input.inAppEnabled
        )
      ),
    markRead: protectedProcedure
      .input(z.object({ notificationId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        controlPlane.markNotificationRead(ctx.user.id, input.notificationId)
      ),
    markAllRead: protectedProcedure.mutation(({ ctx }) =>
      controlPlane.markAllNotificationsRead(ctx.user.id)
    ),
  }),
  operations: router({
    members: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        operations.listMembers(ctx.user.id, input.workspaceId)
      ),
    addMember: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          email: z.string().email().max(320),
          role: z.enum(["operator", "reviewer", "auditor"]),
        })
      )
      .mutation(({ ctx, input }) => operations.addMember(ctx.user.id, input)),
    removeMember: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          membershipId: z.number().int().positive(),
        })
      )
      .mutation(({ ctx, input }) =>
        operations.removeMember(
          ctx.user.id,
          input.workspaceId,
          input.membershipId
        )
      ),
    webhook: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        operations.getWebhookConfiguration(ctx.user.id, input.workspaceId)
      ),
    saveWebhookDraft: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          endpoint: z.string().max(2_048),
          signingSecretReference: z.string().max(240).optional(),
          eventTypes: z
            .array(
              z.enum([
                "approval_required",
                "guardrail_blocked",
                "finding_validated",
                "scheduled_check",
                "policy_review_required",
                "incident_created",
                "webhook_activation_requested",
                "comment_mentioned",
              ])
            )
            .min(1),
          endpointConfirmed: z.boolean(),
        })
      )
      .mutation(({ ctx, input }) =>
        operations.saveWebhookDraft(ctx.user.id, input)
      ),
    archives: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        operations.listAuditArchives(ctx.user.id, input.workspaceId)
      ),
    createArchive: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        operations.createAuditArchive(ctx.user.id, input.workspaceId)
      ),
    verifyArchive: protectedProcedure
      .input(z.object({ archiveId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        operations.verifyAuditArchive(ctx.user.id, input.archiveId)
      ),
    restoreArchivePlan: protectedProcedure
      .input(
        z.object({
          archiveId: z.number().int().positive(),
          destinationWorkspaceId: z.number().int().positive().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        operations.restoreAuditArchivePlan(
          ctx.user.id,
          input.archiveId,
          input.destinationWorkspaceId
        )
      ),
    runDrDrill: protectedProcedure
      .input(
        z.object({
          archiveId: z.number().int().positive(),
          destinationWorkspaceId: z.number().int().positive().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        operations.runAuditArchiveDrill(
          ctx.user.id,
          input.archiveId,
          input.destinationWorkspaceId
        )
      ),
  }),
  assurance: router({
    policies: protectedProcedure
      .input(
        z
          .object({ workspaceId: z.number().int().positive().optional() })
          .optional()
      )
      .query(({ ctx, input }) =>
        assurance.listPolicyVersions(ctx.user.id, input?.workspaceId)
      ),
    requestPolicy: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          safeHarbor: z.string().min(10).max(10_000),
          codeOfConduct: z.string().min(10).max(10_000),
          allowlist: z.array(z.string().min(1).max(255)).min(1).max(100),
          exclusions: z.array(z.string().min(1).max(255)).max(100),
          changeSummary: z.string().min(3).max(5_000),
        })
      )
      .mutation(({ ctx, input }) =>
        assurance.requestPolicyVersion(ctx.user.id, input)
      ),
    decidePolicy: protectedProcedure
      .input(
        z.object({
          policyVersionId: z.number().int().positive(),
          decision: z.enum(["approved", "rejected"]),
          note: z.string().max(2_000),
        })
      )
      .mutation(({ ctx, input }) =>
        assurance.decidePolicyVersion(
          ctx.user.id,
          ctx.user.role,
          input.policyVersionId,
          input.decision,
          input.note
        )
      ),
    comparePolicies: protectedProcedure
      .input(z.object({ fromPolicyVersionId: z.number().int().positive(), toPolicyVersionId: z.number().int().positive() }))
      .query(({ ctx, input }) => assurance.comparePolicyVersions(ctx.user.id, input.fromPolicyVersionId, input.toPolicyVersionId)),
    incidents: protectedProcedure
      .input(
        z
          .object({ workspaceId: z.number().int().positive().optional() })
          .optional()
      )
      .query(({ ctx, input }) =>
        assurance.listIncidents(ctx.user.id, input?.workspaceId)
      ),
    createIncident: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          title: z.string().min(3).max(200),
          description: z.string().min(3).max(10_000),
          severity: z.enum(["low", "medium", "high", "critical"]),
        })
      )
      .mutation(({ ctx, input }) =>
        assurance.createIncident(ctx.user.id, input)
      ),
    acknowledgeIncident: protectedProcedure
      .input(z.object({ incidentId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        assurance.acknowledgeIncident(ctx.user.id, input.incidentId)
      ),
    resolveIncident: protectedProcedure
      .input(
        z.object({
          incidentId: z.number().int().positive(),
          resolutionNote: z.string().max(5_000),
        })
      )
      .mutation(({ ctx, input }) =>
        assurance.resolveIncident(
          ctx.user.id,
          input.incidentId,
          input.resolutionNote
        )
      ),
    incidentReview: protectedProcedure
      .input(z.object({ incidentId: z.number().int().positive() }))
      .query(({ ctx, input }) => assurance.getIncidentReview(ctx.user.id, input.incidentId)),
    saveIncidentReview: protectedProcedure
      .input(z.object({
        incidentId: z.number().int().positive(),
        summary: z.string().min(3).max(10_000),
        rootCause: z.string().min(3).max(10_000),
        actionItems: z.array(z.object({ title: z.string().min(1).max(500), ownerUserId: z.number().int().positive().optional(), dueAt: z.string().datetime().optional(), status: z.enum(["open", "done"]).optional() })).max(100),
        ownerUserId: z.number().int().positive().optional(),
        dueAt: z.string().datetime().optional(),
        closureEvidenceReference: z.string().trim().max(512).optional(),
        status: z.enum(["open", "closed"]).optional(),
      }))
      .mutation(({ ctx, input }) => assurance.saveIncidentReview(ctx.user.id, input)),
    incidentEvidence: protectedProcedure
      .input(z.object({ incidentId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        assurance.listIncidentEvidence(ctx.user.id, input.incidentId)
      ),
    linkIncidentEvidence: protectedProcedure
      .input(
        z.object({
          incidentId: z.number().int().positive(),
          evidenceArtifactId: z.number().int().positive(),
        })
      )
      .mutation(({ ctx, input }) =>
        assurance.linkIncidentEvidence(
          ctx.user.id,
          input.incidentId,
          input.evidenceArtifactId
        )
      ),
    webhookActivationRequests: protectedProcedure
      .input(
        z
          .object({ workspaceId: z.number().int().positive().optional() })
          .optional()
      )
      .query(({ ctx, input }) =>
        assurance.listWebhookActivationRequests(ctx.user.id, input?.workspaceId)
      ),
    requestWebhookActivation: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        assurance.requestWebhookActivation(ctx.user.id, input.workspaceId)
      ),
    decideWebhookActivation: protectedProcedure
      .input(
        z.object({
          requestId: z.number().int().positive(),
          decision: z.enum(["approved", "rejected"]),
          note: z.string().max(2_000),
        })
      )
      .mutation(({ ctx, input }) =>
        assurance.decideWebhookActivation(
          ctx.user.id,
          ctx.user.role,
          input.requestId,
          input.decision,
          input.note
        )
      ),
  }),
  workspace: router({
    list: protectedProcedure.query(({ ctx }) =>
      controlPlane.listWorkspaces(ctx.user.id)
    ),
    create: protectedProcedure
      .input(workspaceInput)
      .mutation(({ ctx, input }) =>
        controlPlane.createWorkspace(ctx.user.id, input)
      ),
    setStatus: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          status: z.enum(["active", "paused", "archived"]),
        })
      )
      .mutation(({ ctx, input }) =>
        controlPlane.setWorkspaceStatus(
          ctx.user.id,
          input.workspaceId,
          input.status
        )
      ),
    credentials: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        controlPlane.listCredentialReferences(ctx.user.id, input.workspaceId)
      ),
    addCredentialReference: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          label: z.string().min(2).max(120),
          secretReference: z.string().min(20).max(200),
        })
      )
      .mutation(({ ctx, input }) =>
        controlPlane.addCredentialReference(
          ctx.user.id,
          input.workspaceId,
          input.label,
          input.secretReference
        )
      ),
    scheduleAdministrativeCheck: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          cron: z.string().trim().min(9).max(64),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const taskUid = `railway:workspace:${input.workspaceId}`;
        return controlPlane.attachScheduleTask(
          ctx.user.id,
          input.workspaceId,
          taskUid,
          input.cron
        );
      }),
  }),
  ai: router({
    models: protectedProcedure.query(() => aiPlatform.listModels()),
    registerModel: protectedProcedure
      .input(
        z.object({
          modelKey: z.string().min(2).max(160),
          provider: z.string().min(2).max(120),
          gateway: z.string().min(2).max(120),
          capabilities: z.array(z.string().min(1).max(80)).max(50),
          contextWindow: z.number().int().min(0).max(10_000_000),
          version: z.string().max(80).optional(),
          inputCostPerMillionCents: z
            .number()
            .int()
            .min(0)
            .max(10_000_000)
            .optional(),
          outputCostPerMillionCents: z
            .number()
            .int()
            .min(0)
            .max(10_000_000)
            .optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        if (ctx.user.role !== "admin")
          throw new Error("Admin role is required to register a model.");
        return aiPlatform.registerModel(ctx.user.id, input);
      }),
    recordModelHealth: protectedProcedure
      .input(
        z.object({
          modelKey: z.string().min(2).max(160),
          status: z.enum(["active", "degraded", "disabled"]),
          latencyMs: z.number().int().min(0).max(600_000).optional(),
          errorCode: z.string().max(120).optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        if (ctx.user.role !== "admin")
          throw new Error("Admin role is required to update model health.");
        return aiPlatform.recordModelHealth(ctx.user.id, input);
      }),
    runs: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        aiPlatform.listAiRuns(ctx.user.id, input.workspaceId)
      ),
    output: protectedProcedure
      .input(z.object({ runId: z.number().int().positive() }))
      .query(({ ctx, input }) => aiPlatform.getAiRunOutput(ctx.user.id, input.runId)),
    evaluationSummary: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive() }))
      .query(({ ctx, input }) => aiPlatform.getAiEvaluationSummary(ctx.user.id, input.workspaceId)),
    evaluations: protectedProcedure
      .input(z.object({ runId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        aiPlatform.listAiRunEvaluations(ctx.user.id, input.runId)
      ),
    evaluateRun: protectedProcedure
      .input(
        z.object({
          runId: z.number().int().positive(),
          rubric: z.string().trim().min(2).max(160),
          score: z.number().int().min(0).max(100),
          verdict: z.enum(["pass", "fail", "needs_review"]),
          notes: z.string().trim().min(2).max(12_000),
        })
      )
      .mutation(({ ctx, input }) => {
        if (ctx.user.role !== "admin")
          throw new Error("Admin role is required to evaluate model runs.");
        return aiPlatform.evaluateAiRun(ctx.user.id, input);
      }),
    startRun: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          sessionId: z.number().int().positive().optional(),
          taskId: z.number().int().positive().optional(),
          modelKey: z.string().min(2).max(160),
          gateway: z.string().min(2).max(120),
          purpose: z.string().min(2).max(120),
          inputReference: z.string().min(2).max(512),
          estimatedCostCents: z
            .number()
            .int()
            .min(0)
            .max(100_000_000)
            .optional(),
          retentionDays: z.number().int().min(1).max(3_650).optional(),
        })
      )
      .mutation(({ ctx, input }) => aiPlatform.startAiRun(ctx.user.id, input)),
    updateRun: protectedProcedure
      .input(
        z.object({
          runId: z.number().int().positive(),
          status: z.enum([
            "running",
            "completed",
            "failed",
            "partial",
            "cancelled",
          ]),
          outputReference: z.string().max(512).optional(),
          inputTokens: z.number().int().min(0).max(10_000_000).optional(),
          outputTokens: z.number().int().min(0).max(10_000_000).optional(),
          costCents: z.number().int().min(0).max(100_000_000).optional(),
          errorCode: z.string().max(120).optional(),
        })
      )
      .mutation(({ ctx, input }) => aiPlatform.updateAiRun(ctx.user.id, input)),
    enqueueJob: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive().optional(),
          kind: z.string().min(2).max(80),
          idempotencyKey: z.string().min(8).max(180),
          payload: z.record(z.string(), z.unknown()),
          maxAttempts: z.number().int().min(1).max(10).optional(),
        })
      )
      .mutation(({ ctx, input }) => aiPlatform.enqueueJob(ctx.user.id, input)),
    jobs: protectedProcedure
      .input(
        z
          .object({ workspaceId: z.number().int().positive().optional() })
          .optional()
      )
      .query(({ ctx, input }) =>
        aiPlatform.listJobs(ctx.user.id, input?.workspaceId)
      ),
    replayOutbox: protectedProcedure
      .input(z.object({ eventId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new Error("Admin role is required to replay outbox events.");
        return aiPlatform.replayFailedOutboxEvent(ctx.user.id, input.eventId);
      }),
    publishEvent: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive().optional(),
          eventType: z.string().min(3).max(120),
          aggregateType: z.string().min(2).max(80),
          aggregateId: z.number().int().positive(),
          idempotencyKey: z.string().min(8).max(180),
          schemaVersion: z.number().int().min(1).max(100).optional(),
          payload: z.record(z.string(), z.unknown()),
        })
      )
      .mutation(({ ctx, input }) =>
        aiPlatform.publishOutboxEvent(ctx.user.id, input)
      ),
  }),
  search: router({
    global: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          query: z.string().trim().min(2).max(120),
          limit: z.number().int().min(1).max(50).optional(),
          entityTypes: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
          freshnessDays: z.number().int().min(1).max(3_650).optional(),
        })
      )
      .query(({ ctx, input }) =>
        globalSearch.searchWorkspace(ctx.user.id, input)
      ),
    savedViews: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive() }))
      .query(({ ctx, input }) => savedViewService.listSavedViews(ctx.user.id, input.workspaceId)),
    saveView: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive(), name: z.string().trim().min(2).max(120), query: z.string().trim().max(512), filters: z.record(z.string(), z.unknown()).optional() }))
      .mutation(({ ctx, input }) => savedViewService.createSavedView(ctx.user.id, input)),
    deleteView: protectedProcedure
      .input(z.object({ savedViewId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => savedViewService.deleteSavedView(ctx.user.id, input.savedViewId)),
    tags: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(({ ctx, input }) => tagsNotes.listTags(ctx.user.id, input.workspaceId)),
    upsertTag: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), name: z.string().trim().min(2).max(80), color: z.string().max(16).optional() })).mutation(({ ctx, input }) => tagsNotes.upsertTag(ctx.user.id, input)),
    assignments: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), entityType: z.string().trim().min(1).max(60), entityId: z.number().int().positive() })).query(({ ctx, input }) => tagsNotes.listAssignments(ctx.user.id, input)),
    assignTag: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), tagId: z.number().int().positive(), entityType: z.string().trim().min(1).max(60), entityId: z.number().int().positive() })).mutation(({ ctx, input }) => tagsNotes.assignTag(ctx.user.id, input)),
    unassignTag: protectedProcedure.input(z.object({ assignmentId: z.number().int().positive() })).mutation(({ ctx, input }) => tagsNotes.unassignTag(ctx.user.id, input.assignmentId)),
    notes: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), entityType: z.string().trim().min(1).max(60).optional(), entityId: z.number().int().positive().optional() })).query(({ ctx, input }) => tagsNotes.listNotes(ctx.user.id, input)),
    createNote: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), entityType: z.string().trim().min(1).max(60), entityId: z.number().int().positive().optional(), title: z.string().trim().min(2).max(240), body: z.string().trim().min(1), visibility: z.enum(["private", "workspace"]).optional() })).mutation(({ ctx, input }) => tagsNotes.createNote(ctx.user.id, input)),
    updateNote: protectedProcedure.input(z.object({ noteId: z.number().int().positive(), title: z.string().trim().min(2).max(240), body: z.string().trim().min(1), visibility: z.enum(["private", "workspace"]).optional() })).mutation(({ ctx, input }) => tagsNotes.updateNote(ctx.user.id, input)),
    deleteNote: protectedProcedure.input(z.object({ noteId: z.number().int().positive() })).mutation(({ ctx, input }) => tagsNotes.deleteNote(ctx.user.id, input.noteId)),
  }),
  knowledge: router({
    graph: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive(), nodeType: z.enum(["asset", "observation", "hypothesis", "finding", "intelligence", "entity", "document"]).optional(), status: z.enum(["active", "archived"]).optional() }))
      .query(({ ctx, input }) => knowledgeGraph.listGraph(ctx.user.id, input.workspaceId, input)),
    upsertNode: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive(), nodeType: z.enum(["asset", "observation", "hypothesis", "finding", "intelligence", "entity", "document"]), externalId: z.string().trim().min(1).max(160), label: z.string().trim().min(1).max(240), properties: z.record(z.string(), z.unknown()).optional() }))
      .mutation(({ ctx, input }) => knowledgeGraph.upsertNode(ctx.user.id, input)),
    createEdge: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive(), sourceNodeId: z.number().int().positive(), targetNodeId: z.number().int().positive(), relationType: z.string().trim().min(1).max(80), confidence: z.number().int().min(0).max(100).optional(), provenance: z.record(z.string(), z.unknown()).optional() }))
      .mutation(({ ctx, input }) => knowledgeGraph.createEdge(ctx.user.id, input)),
    traverse: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive(), startNodeId: z.number().int().positive(), maxDepth: z.number().int().min(0).max(12).optional(), limit: z.number().int().min(1).max(500).optional() }))
      .query(({ ctx, input }) => knowledgeGraph.traverseGraph(ctx.user.id, input)),
  }),
  evidence: router({
    list: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        evidenceWorkflow.listEvidenceWithProvenance(
          ctx.user.id,
          input.workspaceId
        )
      ),
    recordProvenance: protectedProcedure
      .input(
        z.object({
          evidenceArtifactId: z.number().int().positive(),
          sourceType: z.string().min(2).max(64),
          sourceReference: z.string().min(2).max(512),
          capturedAt: z.coerce.date(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        evidenceWorkflow.recordEvidenceProvenance(ctx.user.id, input)
      ),
    linkResearchNode: protectedProcedure
      .input(
        z.object({
          evidenceArtifactId: z.number().int().positive(),
          observationId: z.number().int().positive().optional(),
          hypothesisId: z.number().int().positive().optional(),
          linkType: z.string().trim().min(2).max(40),
        })
      )
      .mutation(({ ctx, input }) =>
        evidenceWorkflow.linkEvidenceToResearchNode(ctx.user.id, input)
      ),
    findingRelations: protectedProcedure
      .input(z.object({ findingId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        evidenceWorkflow.listFindingRelations(ctx.user.id, input.findingId)
      ),
    duplicateCandidates: protectedProcedure
      .input(
        z.object({
          findingId: z.number().int().positive(),
          query: z.string().trim().min(3).max(120),
        })
      )
      .query(({ ctx, input }) =>
        evidenceWorkflow.findDuplicateCandidates(ctx.user.id, input)
      ),
    linkFindingRelation: protectedProcedure
      .input(
        z.object({
          findingId: z.number().int().positive(),
          relatedFindingId: z.number().int().positive(),
          relationType: z.enum(["duplicate", "related", "supersedes"]),
        })
      )
      .mutation(({ ctx, input }) =>
        evidenceWorkflow.linkFindingRelation(ctx.user.id, input)
      ),
    findingRetests: protectedProcedure
      .input(z.object({ findingId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        evidenceWorkflow.listFindingRetests(ctx.user.id, input.findingId)
      ),
    requestRetest: protectedProcedure
      .input(z.object({ findingId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        evidenceWorkflow.requestFindingRetest(ctx.user.id, input.findingId)
      ),
    completeRetest: protectedProcedure
      .input(
        z.object({
          retestId: z.number().int().positive(),
          status: z.enum([
            "in_progress",
            "passed",
            "failed",
            "inconclusive",
            "cancelled",
          ]),
          resultSummary: z.string().min(3).max(20_000),
          evidenceArtifactId: z.number().int().positive().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        evidenceWorkflow.completeFindingRetest(ctx.user.id, input)
      ),
    qualityGate: protectedProcedure
      .input(z.object({ findingId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        evidenceWorkflow.getFindingQualityGate(ctx.user.id, input.findingId)
      ),
  }),
  organization: router({
    entitlement: protectedProcedure
      .input(z.object({ organizationId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        securityPlatform.getEntitlement(ctx.user.id, input.organizationId)
      ),
    updateEntitlement: protectedProcedure
      .input(
        z.object({
          organizationId: z.number().int().positive(),
          plan: z.enum(["free", "team", "enterprise"]),
          featureFlags: z.array(z.string().min(1).max(80)).max(100),
          limits: z.record(
            z.string(),
            z.number().int().min(0).max(1_000_000_000)
          ),
          periodEnd: z.coerce.date(),
        })
      )
      .mutation(({ ctx, input }) =>
        securityPlatform.updateEntitlement(ctx.user.id, input)
      ),
    list: protectedProcedure.query(({ ctx }) =>
      organization.listOrganizations(ctx.user.id)
    ),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(2).max(160) }))
      .mutation(({ ctx, input }) =>
        organization.createOrganization(ctx.user.id, input)
      ),
    members: protectedProcedure
      .input(z.object({ organizationId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        organization.listOrganizationMembers(ctx.user.id, input.organizationId)
      ),
    addMember: protectedProcedure
      .input(z.object({ organizationId: z.number().int().positive(), email: z.string().email().max(320), role: z.enum(["admin", "researcher", "reviewer", "auditor"]) }))
      .mutation(({ ctx, input }) => organization.addOrganizationMember(ctx.user.id, input)),
    invitations: protectedProcedure.input(z.object({ organizationId: z.number().int().positive() })).query(({ ctx, input }) => organization.listOrganizationInvitations(ctx.user.id, input.organizationId)),
    createInvitation: protectedProcedure.input(z.object({ organizationId: z.number().int().positive(), email: z.string().email().max(320), role: z.enum(["admin", "researcher", "reviewer", "auditor"]), expiresInDays: z.number().int().min(1).max(30).optional() })).mutation(async ({ ctx, input }) => {
      const invitation = await organization.createOrganizationInvitation(ctx.user.id, input);
      if (invitation.invitationId) await aiPlatform.enqueueJob(ctx.user.id, { kind: "email.invitation", idempotencyKey: `invitation-email:${invitation.invitationId}`, payload: { type: "organization_invitation", invitationId: invitation.invitationId, token: invitation.token, email: invitation.email, role: invitation.role, organizationName: invitation.organizationName, expiresAt: invitation.expiresAt.toISOString() }, maxAttempts: 5 });
      return invitation;
    }),
    acceptInvitation: protectedProcedure.input(z.object({ token: z.string().trim().min(20).max(200) })).mutation(({ ctx, input }) => organization.acceptOrganizationInvitation(ctx.user.id, input.token)),
    revokeInvitation: protectedProcedure.input(z.object({ invitationId: z.number().int().positive() })).mutation(({ ctx, input }) => organization.revokeOrganizationInvitation(ctx.user.id, input.invitationId)),
    resendInvitation: protectedProcedure.input(z.object({ invitationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const invitation = await organization.resendOrganizationInvitation(ctx.user.id, input.invitationId);
      if (invitation.invitationId) await aiPlatform.enqueueJob(ctx.user.id, { kind: "email.invitation", idempotencyKey: `invitation-email:${invitation.invitationId}`, payload: { type: "organization_invitation", invitationId: invitation.invitationId, token: invitation.token, email: invitation.email, role: invitation.role, organizationName: invitation.organizationName, expiresAt: invitation.expiresAt.toISOString() }, maxAttempts: 5 });
      return invitation;
    }),
    programs: protectedProcedure
      .input(z.object({ organizationId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        organization.listPrograms(ctx.user.id, input.organizationId)
      ),
    createProgram: protectedProcedure
      .input(
        z.object({
          organizationId: z.number().int().positive(),
          name: z.string().min(3).max(200),
          description: z.string().max(20_000),
          includedAssets: z.array(z.string().min(1).max(512)).min(1).max(500),
          excludedAssets: z.array(z.string().min(1).max(512)).max(500),
          rules: z.array(z.string().min(1).max(4_000)).max(100),
          safeHarbor: z.string().min(10).max(20_000),
        })
      )
      .mutation(({ ctx, input }) =>
        organization.createProgram(ctx.user.id, input)
      ),
    previewProgramScope: protectedProcedure
      .input(
        z.object({
          programId: z.number().int().positive(),
          includedAssets: z.array(z.string().min(1).max(512)).max(500),
          excludedAssets: z.array(z.string().min(1).max(512)).max(500),
          rules: z.array(z.string().min(1).max(4_000)).max(100),
          safeHarbor: z.string().min(10).max(20_000),
        })
      )
      .query(({ ctx, input }) =>
        organization.previewProgramScopeChange(ctx.user.id, input)
      ),
    setProgramStatus: protectedProcedure
      .input(
        z.object({
          programId: z.number().int().positive(),
          status: z.enum([
            "draft",
            "active",
            "paused",
            "completed",
            "archived",
          ]),
        })
      )
      .mutation(({ ctx, input }) =>
        organization.setProgramStatus(
          ctx.user.id,
          input.programId,
          input.status
        )
      ),
    linkWorkspaceToProgram: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          organizationId: z.number().int().positive(),
          programId: z.number().int().positive(),
        })
      )
      .mutation(({ ctx, input }) =>
        organization.linkWorkspaceToProgram(ctx.user.id, input)
      ),
    submissions: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        submissionWorkflow.listSubmissions(ctx.user.id, input.workspaceId)
      ),
    submissionEvents: protectedProcedure
      .input(z.object({ submissionId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        submissionWorkflow.listSubmissionEvents(ctx.user.id, input.submissionId)
      ),
    createSubmission: protectedProcedure
      .input(
        z.object({
          findingId: z.number().int().positive(),
          reportVersionId: z.number().int().positive(),
          externalReference: z.string().max(240).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        submissionWorkflow.createSubmission(ctx.user.id, input)
      ),
    transitionSubmission: protectedProcedure
      .input(
        z.object({
          submissionId: z.number().int().positive(),
          status: z.enum([
            "submitted",
            "acknowledged",
            "triaged",
            "accepted",
            "rejected",
            "duplicate",
            "resolved",
            "retest",
          ]),
          note: z.string().max(5_000).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        submissionWorkflow.transitionSubmission(ctx.user.id, input)
      ),
  }),
  research: router({
    sessions: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        researchWorkflow.listResearchSessions(ctx.user.id, input.workspaceId)
      ),
    sessionsPage: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive(), pageSize: z.number().int().min(1).max(100).optional(), cursor: z.string().max(512).optional() }))
      .query(({ ctx, input }) => researchWorkflow.listResearchSessionsPage(ctx.user.id, input)),
    createSession: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          title: z.string().min(3).max(200),
        })
      )
      .mutation(({ ctx, input }) =>
        researchWorkflow.createResearchSession(ctx.user.id, input)
      ),
    transitionSession: protectedProcedure
      .input(
        z.object({
          sessionId: z.number().int().positive(),
          state: z.enum([
            "draft",
            "ready",
            "active",
            "paused",
            "completed",
            "archived",
          ]),
          expectedRevision: z.number().int().min(0).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        researchWorkflow.transitionResearchSession(
          ctx.user.id,
          input.sessionId,
          input.state,
          input.expectedRevision
        )
      ),
    assets: protectedProcedure
      .input(z.object({ sessionId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        researchWorkflow.listResearchAssets(ctx.user.id, input.sessionId)
      ),
    createAsset: protectedProcedure
      .input(
        z.object({
          sessionId: z.number().int().positive(),
          assetType: z.enum([
            "domain",
            "subdomain",
            "ip",
            "application",
            "api",
            "endpoint",
            "technology",
            "service",
          ]),
          value: z.string().min(1).max(512),
          hostname: z.string().max(255).optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        researchWorkflow.createResearchAsset(ctx.user.id, input)
      ),
    observations: protectedProcedure
      .input(z.object({ sessionId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        researchWorkflow.listResearchObservations(ctx.user.id, input.sessionId)
      ),
    createObservation: protectedProcedure
      .input(
        z.object({
          sessionId: z.number().int().positive(),
          assetId: z.number().int().positive().optional(),
          title: z.string().min(3).max(240),
          content: z.string().min(3).max(20_000),
        })
      )
      .mutation(({ ctx, input }) =>
        researchWorkflow.createResearchObservation(ctx.user.id, input)
      ),
    promoteObservationToFinding: protectedProcedure
      .input(z.object({ sessionId: z.number().int().positive(), observationId: z.number().int().positive(), confidence: z.number().int().min(0).max(100).optional(), impactSummary: z.string().min(3).max(20_000) }))
      .mutation(({ ctx, input }) => researchWorkflow.promoteObservationToFinding(ctx.user.id, input)),
    hypotheses: protectedProcedure
      .input(z.object({ sessionId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        researchWorkflow.listResearchHypotheses(ctx.user.id, input.sessionId)
      ),
    createHypothesis: protectedProcedure
      .input(
        z.object({
          sessionId: z.number().int().positive(),
          assetId: z.number().int().positive().optional(),
          observationId: z.number().int().positive().optional(),
          description: z.string().min(3).max(20_000),
          reason: z.string().min(3).max(20_000),
          priority: z.number().int().min(1).max(100),
        })
      )
      .mutation(({ ctx, input }) =>
        researchWorkflow.createResearchHypothesis(ctx.user.id, input)
      ),
    transitionHypothesis: protectedProcedure
      .input(
        z.object({
          hypothesisId: z.number().int().positive(),
          status: z.enum([
            "proposed",
            "investigating",
            "supported",
            "disproven",
            "validated",
            "archived",
          ]),
          outcome: z.string().max(20_000).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        researchWorkflow.transitionResearchHypothesis(
          ctx.user.id,
          input.hypothesisId,
          input.status,
          input.outcome
        )
      ),
    tasks: protectedProcedure
      .input(z.object({ sessionId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        researchWorkflow.listResearchTasks(ctx.user.id, input.sessionId)
      ),
    tasksPage: protectedProcedure
      .input(z.object({ sessionId: z.number().int().positive(), pageSize: z.number().int().min(1).max(100).optional(), cursor: z.string().max(512).optional() }))
      .query(({ ctx, input }) => researchWorkflow.listResearchTasksPage(ctx.user.id, input)),
    createTask: protectedProcedure
      .input(
        z.object({
          sessionId: z.number().int().positive(),
          type: z.string().min(2).max(80),
          title: z.string().min(3).max(240),
          priority: z.number().int().min(1).max(100),
          dependencies: z
            .array(z.number().int().positive())
            .max(50)
            .default([]),
          ownerUserId: z.number().int().positive().optional(),
          assetId: z.number().int().positive().optional(),
          vectorKey: z.string().min(2).max(160).optional(),
          requiredCapabilities: z.array(z.string().min(2).max(120)).max(20).optional(),
          suggestedAdapters: z.array(z.string().min(2).max(120)).max(20).optional(),
          riskClass: z.enum(["low", "medium", "high", "critical"]).optional(),
          inputs: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        researchWorkflow.createResearchTask(ctx.user.id, input)
      ),
    approveTask: protectedProcedure
      .input(z.object({ taskId: z.number().int().positive(), expectedRevision: z.number().int().min(0).optional() }))
      .mutation(({ ctx, input }) => researchWorkflow.approveResearchTask(ctx.user.id, input.taskId, input.expectedRevision)),
    transitionTask: protectedProcedure
      .input(
        z.object({
          taskId: z.number().int().positive(),
          status: z.enum([
            "queued",
            "running",
            "blocked",
            "paused",
            "failed",
            "retrying",
            "completed",
            "cancelled",
          ]),
          outputs: z.record(z.string(), z.unknown()).optional(),
          expectedRevision: z.number().int().min(0).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        researchWorkflow.transitionResearchTask(
          ctx.user.id,
          input.taskId,
          input.status,
          input.outputs,
          input.expectedRevision
        )
      ),
    failureObservations: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          sessionId: z.number().int().positive().optional(),
        })
      )
      .query(({ ctx, input }) =>
        researchIntelligence.listFailureObservations(
          ctx.user.id,
          input.workspaceId,
          input.sessionId
        )
      ),
    createFailureObservation: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          sessionId: z.number().int().positive(),
          kind: z.enum([
            "timeout",
            "dependency_failure",
            "partial_response",
            "error_state",
            "recovery_behavior",
            "retry_behavior",
            "concurrency",
            "race_condition",
            "transaction_failure",
            "degraded_mode",
            "cascading_failure",
          ]),
          normalState: z.string().min(1).max(240),
          condition: z.string().min(1).max(20_000),
          observedBehavior: z.string().min(1).max(20_000),
          impact: z.enum(["none", "low", "medium", "high", "critical"]),
          evidenceRefs: z.array(z.string().min(1).max(512)).max(100),
        })
      )
      .mutation(({ ctx, input }) =>
        researchIntelligence.createFailureObservation(ctx.user.id, input)
      ),
    evolutionSnapshots: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          assetRef: z.string().max(512).optional(),
        })
      )
      .query(({ ctx, input }) =>
        researchIntelligence.listEvolutionSnapshots(
          ctx.user.id,
          input.workspaceId,
          input.assetRef
        )
      ),
    compareEvolution: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          assetRef: z.string().min(1).max(512),
        })
      )
      .query(({ ctx, input }) =>
        researchIntelligence.compareLatestEvolution(
          ctx.user.id,
          input.workspaceId,
          input.assetRef
        )
      ),
    createEvolutionSnapshot: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          sessionId: z.number().int().positive().optional(),
          assetRef: z.string().min(1).max(512),
          version: z.string().min(1).max(120),
          capturedAt: z.coerce.date(),
          source: z.string().min(1).max(120),
          attributes: z.record(
            z.string(),
            z.union([z.string(), z.number(), z.boolean(), z.null()])
          ),
        })
      )
      .mutation(({ ctx, input }) =>
        researchIntelligence.createEvolutionSnapshot(ctx.user.id, input)
      ),
    intelligenceFeed: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          assetRef: z.string().max(512).optional(),
        })
      )
      .query(({ ctx, input }) =>
        researchIntelligence.listIntelligenceFeed(
          ctx.user.id,
          input.workspaceId,
          input.assetRef
        )
      ),
    ingestIntelligenceFeed: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive(), items: z.array(z.object({ source: z.string().min(1).max(120), observedAt: z.coerce.date().transform(value => value.toISOString()), assetRef: z.string().min(1).max(512), confidence: z.number().min(0).max(100), reference: z.string().max(512).optional(), data: z.record(z.string(), z.unknown()) })).min(1).max(100) }))
      .mutation(({ ctx, input }) => researchIntelligence.ingestIntelligenceFeed(ctx.user.id, input)),
    enqueueIntelligenceFetch: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive(), providerUrl: z.string().url().max(2_000), idempotencyKey: z.string().trim().min(8).max(180) }))
      .mutation(({ ctx, input }) => researchIntelligence.enqueueIntelligenceFetch(ctx.user.id, input)),
    createIntelligenceFeed: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          source: z.string().min(1).max(120),
          observedAt: z.coerce.date().transform(value => value.toISOString()),
          assetRef: z.string().min(1).max(512),
          confidence: z.number().min(0).max(100),
          reference: z.string().max(512).optional(),
          data: z.record(z.string(), z.unknown()),
        })
      )
      .mutation(({ ctx, input }) =>
        researchIntelligence.createIntelligenceFeedItem(ctx.user.id, input)
      ),
    playbooks: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        researchIntelligence.listPlaybooks(ctx.user.id, input.workspaceId)
      ),
    runPlaybook: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive(), sessionId: z.number().int().positive(), playbookId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => researchIntelligence.runPlaybook(ctx.user.id, input)),
    playbookRuns: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive(), sessionId: z.number().int().positive().optional() }))
      .query(({ ctx, input }) => researchIntelligence.listPlaybookRuns(ctx.user.id, input.workspaceId, input.sessionId)),
    transitionPlaybookRun: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive(), runId: z.number().int().positive(), status: z.enum(["queued", "running", "paused", "failed", "completed", "cancelled"]), error: z.string().max(4_000).optional(), completedTaskIds: z.array(z.number().int().positive()).max(200).optional(), failedTaskIds: z.array(z.number().int().positive()).max(200).optional(), nextTaskIndex: z.number().int().min(0).max(200).optional() }))
      .mutation(({ ctx, input }) => researchIntelligence.transitionPlaybookRun(ctx.user.id, input)),
    createPlaybook: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          slug: z.string().min(1).max(160),
          version: z.string().min(1).max(40),
          status: z.enum(["draft", "active", "deprecated"]).optional(),
          domains: z.array(z.string().min(1).max(80)).max(50),
          assetTypes: z.array(z.string().min(1).max(80)).max(50),
          technologies: z.array(z.string().min(1).max(120)).max(100).optional(),
          taskTemplates: z.array(z.unknown()).max(200),
        })
      )
      .mutation(({ ctx, input }) =>
        researchIntelligence.createPlaybook(ctx.user.id, input)
      ),
  }),
  rehearsal: router({
    run: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        controlPlane.rehearseWorkspace(ctx.user.id, input.workspaceId)
      ),
    listRuns: protectedProcedure
      .input(
        z
          .object({ workspaceId: z.number().int().positive().optional() })
          .optional()
      )
      .query(({ ctx, input }) =>
        controlPlane.listRuns(ctx.user.id, input?.workspaceId)
      ),
  }),
  governance: router({
    list: protectedProcedure.query(({ ctx }) =>
      controlPlane.listApprovals(ctx.user.id, ctx.user.role)
    ),
    requestTier3: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          action: z.literal("privileged_proof"),
          context: z.object({
            target: z.string().trim().max(512).optional(),
            tool: z.string().trim().max(160).optional(),
            riskClass: z.enum(["high", "critical"]).optional(),
            scopeDigest: z.string().trim().max(128).optional(),
            expectedImpact: z.string().trim().max(4_000).optional(),
          }).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        controlPlane.requestApproval(
          ctx.user.id,
          input.workspaceId,
          input.action,
          input.context ?? {}
        )
      ),
    decide: protectedProcedure
      .input(
        z.object({
          approvalId: z.number().int().positive(),
          decision: z.enum(["approved", "rejected"]),
          note: z.string().max(2_000),
        })
      )
      .mutation(({ ctx, input }) =>
        controlPlane.decideApproval(
          ctx.user.id,
          ctx.user.role,
          input.approvalId,
          input.decision,
          input.note
        )
      ),
  }),
  finding: router({
    list: protectedProcedure
      .input(
        z
          .object({ workspaceId: z.number().int().positive().optional() })
          .optional()
      )
      .query(({ ctx, input }) =>
        controlPlane.listFindings(ctx.user.id, input?.workspaceId)
      ),
    create: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          fingerprint: z.string().min(8).max(96),
          title: z.string().min(3).max(240),
          impactSummary: z.string().min(10).max(12_000),
          reportDraft: z.string().min(10).max(20_000),
          confidence: z.number().int().min(0).max(100),
        })
      )
      .mutation(({ ctx, input }) =>
        controlPlane.createFinding(ctx.user.id, input)
      ),
    transition: protectedProcedure
      .input(
        z.object({
          findingId: z.number().int().positive(),
          status: z.enum([
            "triaged",
            "candidate",
            "reproducing",
            "validated",
            "reported",
            "invalid",
            "duplicate",
            "inconclusive",
          ]),
        })
      )
      .mutation(({ ctx, input }) =>
        controlPlane.transitionFinding(ctx.user.id, input)
      ),
    approveReview: protectedProcedure
      .input(z.object({ findingId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        controlPlane.approveFindingReview(ctx.user.id, input.findingId)
      ),
    comments: protectedProcedure
      .input(
        z.object({
          findingId: z.number().int().positive(),
          workspaceId: z.number().int().positive(),
        })
      )
      .query(({ ctx, input }) =>
        collaboration.listFindingComments(
          ctx.user.id,
          input.findingId,
          input.workspaceId
        )
      ),
    addComment: protectedProcedure
      .input(
        z.object({
          findingId: z.number().int().positive(),
          workspaceId: z.number().int().positive(),
          body: z.string().trim().min(1).max(4_000),
          parentCommentId: z.number().int().positive().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        collaboration.addFindingComment(ctx.user.id, input)
      ),
  }),
  audit: router({
    list: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive(), traceId: z.string().trim().max(128).optional() }))
      .query(({ ctx, input }) =>
        controlPlane.listAudit(ctx.user.id, input.workspaceId, input.traceId)
      ),
    evidence: protectedProcedure
      .input(z.object({ workspaceId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        controlPlane.listEvidence(ctx.user.id, input.workspaceId)
      ),
    uploadEvidence: protectedProcedure
      .input(
        z.object({
          workspaceId: z.number().int().positive(),
          findingId: z.number().int().positive().optional(),
          fileName: z.string().min(1).max(120),
          contentType: z.string().min(3).max(100),
          contentBase64: z.string().min(4).max(7_000_000),
        })
      )
      .mutation(({ ctx, input }) =>
        controlPlane.uploadEvidence(ctx.user.id, input)
      ),
    markEvidenceScanned: protectedProcedure
      .input(
        z.object({
          evidenceArtifactId: z.number().int().positive(),
          scanPassed: z.boolean(),
          reason: z.string().max(2_000).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        controlPlane.markEvidenceScanned(
          ctx.user.id,
          input.evidenceArtifactId,
          input.scanPassed,
          input.reason
        )
      ),
    promoteEvidence: protectedProcedure
      .input(z.object({ evidenceArtifactId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        controlPlane.promoteEvidence(ctx.user.id, input.evidenceArtifactId)
      ),
  }),
});

export type AppRouter = typeof appRouter;
