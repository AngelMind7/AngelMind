# AngelMind V4 — Database Contract

The blueprint describes a primary relational model of 50+ tables. The repository uses Drizzle migrations as the executable database layer; this document preserves the blueprint's logical model without forcing a destructive ORM replacement.

## Logical domains

- Identity: User, Session, MFADevice, ApiKey, SecurityEvent, TrustedDevice, Credential.
- Organization: Organization, OrganizationMember, Workspace, WorkspaceMember, Tag, Note, SavedView, Plan, Entitlement, Subscription, Invoice, UsageRecord, QuotaLimit, QuotaUsage.
- Asset intelligence: Asset, AssetRelation, Technology, DiscoveryJob, DiscoveryResult, ShadowAsset, ShadowAlert, AssetSnapshot, AssetChange.
- Evidence/findings: Research, Task, Hypothesis, Observation, Evidence, EvidenceOrigin, Finding, FindingEvidence, FindingRelation, Retest, Comment, DeduplicationRecord.
- AI: AIModel, AIRun, AIResult, AIEvaluation, AIMemory, PromptRegistry, PromptVersion, AIWorker, WorkerMemory, WorkerAction, Playbook, PlaybookRun, PlaybookStep, AIBudget, AIUsage, AIAlert, ModelEval, EvalMetric.
- Tools/execution: ToolCatalog, ToolVersion, ToolExecution, ToolOutput, JobQueue, Approval.
- Knowledge: KnowledgeNode, KnowledgeEdge.
- Reporting: Report, ReportVersion.
- Governance: Policy, AuditLog, AuditChain, Control, ControlEvidence, RetentionPolicy, RetentionAction, Risk, RiskTreatment, Vendor, VendorAssessment.
- Incidents/notifications: Incident, IncidentEvidence, PostIncidentReview, Notification, NotificationPreference, EmailLog, WebhookConfig, WebhookDelivery.
- Bug bounty: Program, ProgramScope, ResearcherProfile, Submission, SubmissionEvidence, Reward, LeaderboardEntry, DisclosureRequest.

## Invariants

1. Tenant/workspace boundaries are enforced before reads and writes.
2. Evidence preserves provenance and integrity metadata.
3. Execution records retain lifecycle state and actor information.
4. High-risk actions require policy and approval checks.
5. Secrets are stored masked/encrypted and never emitted into public evidence.
6. Migrations are append-only, journaled and rollback-reviewed.
