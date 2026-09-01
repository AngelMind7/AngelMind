from pathlib import Path

schema = Path('/home/ubuntu/AngelMind/drizzle/schema.ts')
s = schema.read_text()
repls = {
'  scopeDigest: varchar("scopeDigest", { length: 128 }).notNull(),\n': '  scopeDigest: varchar("scopeDigest", { length: 128 }).notNull(),\n  traceId: varchar("traceId", { length: 128 }),\n',
'  metadata: text("metadata").notNull(),\n  createdByUserId: int("createdByUserId").notNull(),\n  createdAt: timestamp("createdAt").defaultNow().notNull(),\n}, table => [index("research_asset_id_workspace_idx")': '  metadata: text("metadata").notNull(),\n  traceId: varchar("traceId", { length: 128 }),\n  createdByUserId: int("createdByUserId").notNull(),\n  createdAt: timestamp("createdAt").defaultNow().notNull(),\n}, table => [index("research_asset_id_workspace_idx")',
'  status: mysqlEnum("status", researchObservationStatus).default("new").notNull(),\n  createdByUserId: int("createdByUserId").notNull(),\n': '  status: mysqlEnum("status", researchObservationStatus).default("new").notNull(),\n  traceId: varchar("traceId", { length: 128 }),\n  createdByUserId: int("createdByUserId").notNull(),\n',
'  outcome: text("outcome"),\n  createdByUserId: int("createdByUserId").notNull(),\n': '  outcome: text("outcome"),\n  traceId: varchar("traceId", { length: 128 }),\n  createdByUserId: int("createdByUserId").notNull(),\n',
'  retryCount: int("retryCount").default(0).notNull(),\n  createdByUserId: int("createdByUserId").notNull(),\n': '  retryCount: int("retryCount").default(0).notNull(),\n  traceId: varchar("traceId", { length: 128 }),\n  createdByUserId: int("createdByUserId").notNull(),\n',
'  humanReviewStatus: mysqlEnum("humanReviewStatus", ["pending", "approved", "rejected"] as const).default("pending").notNull(),\n': '  humanReviewStatus: mysqlEnum("humanReviewStatus", ["pending", "approved", "rejected"] as const).default("pending").notNull(),\n  traceId: varchar("traceId", { length: 128 }),\n',
'  quarantineReason: text("quarantineReason"),\n': '  quarantineReason: text("quarantineReason"),\n  traceId: varchar("traceId", { length: 128 }),\n',
}
for old, new in repls.items():
    if old not in s:
        raise SystemExit(f'missing schema anchor: {old[:80]}')
    s = s.replace(old, new, 1)
schema.write_text(s)

workflow = Path('/home/ubuntu/AngelMind/server/research-workflow.ts')
s = workflow.read_text()
s = s.replace('  const scopeDigest = digest(JSON.stringify({ allowlist: workspace.allowlist, exclusions: workspace.exclusions, safeHarbor: workspace.safeHarbor, codeOfConduct: workspace.codeOfConduct }));\n  await db.insert(researchSessions).values({ workspaceId: workspace.id, ownerUserId: userId, title: input.title.trim(), state: "draft", scopeDigest });', '  const scopeDigest = digest(JSON.stringify({ allowlist: workspace.allowlist, exclusions: workspace.exclusions, safeHarbor: workspace.safeHarbor, codeOfConduct: workspace.codeOfConduct }));\n  const traceId = currentTraceContext()?.traceId ?? null;\n  await db.insert(researchSessions).values({ workspaceId: workspace.id, ownerUserId: userId, title: input.title.trim(), state: "draft", scopeDigest, traceId });')
s = s.replace('  const inScope = isTargetInScope(target, parseJson<string[]>(workspace.allowlist, []), parseJson<string[]>(workspace.exclusions, []));\n  await db.insert(researchAssets).values({', '  const inScope = isTargetInScope(target, parseJson<string[]>(workspace.allowlist, []), parseJson<string[]>(workspace.exclusions, []));\n  const traceId = currentTraceContext()?.traceId ?? session.traceId ?? null;\n  await db.insert(researchAssets).values({')
s = s.replace('createdByUserId: userId });\n  const [asset]', 'createdByUserId: userId, traceId });\n  const [asset]', 1)
s = s.replace('  await db.insert(researchObservations).values({ workspaceId: session.workspaceId, sessionId: session.id, assetId: input.assetId ?? null, title: input.title.trim(), content: input.content.trim(), status: "new", createdByUserId: userId });', '  const traceId = currentTraceContext()?.traceId ?? session.traceId ?? null;\n  await db.insert(researchObservations).values({ workspaceId: session.workspaceId, sessionId: session.id, assetId: input.assetId ?? null, title: input.title.trim(), content: input.content.trim(), status: "new", traceId, createdByUserId: userId });')
s = s.replace('  await db.insert(findings).values({ workspaceId: session.workspaceId, fingerprint, title, status: "discovered", confidence:', '  const traceId = currentTraceContext()?.traceId ?? observation.traceId ?? session.traceId ?? null;\n  await db.insert(findings).values({ workspaceId: session.workspaceId, fingerprint, title, status: "discovered", traceId, confidence:')
s = s.replace('createdByUserId: userId });\n  const [hypothesis]', 'createdByUserId: userId, traceId: currentTraceContext()?.traceId ?? session.traceId ?? null });\n  const [hypothesis]', 1)
s = s.replace('outputs: "{}", retryCount: 0,', 'outputs: "{}", retryCount: 0, traceId: currentTraceContext()?.traceId ?? session.traceId ?? null,')
workflow.write_text(s)

migration = Path('/home/ubuntu/AngelMind/drizzle/0035_trace_lineage.sql')
migration.write_text('''ALTER TABLE `researchSessions` ADD COLUMN `traceId` varchar(128) NULL;\nALTER TABLE `researchAssets` ADD COLUMN `traceId` varchar(128) NULL;\nALTER TABLE `researchObservations` ADD COLUMN `traceId` varchar(128) NULL;\nALTER TABLE `researchHypotheses` ADD COLUMN `traceId` varchar(128) NULL;\nALTER TABLE `researchTasks` ADD COLUMN `traceId` varchar(128) NULL;\nALTER TABLE `findings` ADD COLUMN `traceId` varchar(128) NULL;\nALTER TABLE `evidenceArtifacts` ADD COLUMN `traceId` varchar(128) NULL;\nCREATE INDEX `research_session_trace_idx` ON `researchSessions` (`traceId`);\nCREATE INDEX `research_asset_trace_idx` ON `researchAssets` (`traceId`);\nCREATE INDEX `research_observation_trace_idx` ON `researchObservations` (`traceId`);\nCREATE INDEX `research_hypothesis_trace_idx` ON `researchHypotheses` (`traceId`);\nCREATE INDEX `research_task_trace_idx` ON `researchTasks` (`traceId`);\nCREATE INDEX `finding_trace_idx` ON `findings` (`traceId`);\nCREATE INDEX `evidence_artifact_trace_idx` ON `evidenceArtifacts` (`traceId`);\n''')
print('trace lineage patch prepared')
