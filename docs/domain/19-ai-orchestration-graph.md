# AI Orchestration and Persisted Agent-Run Graph

The AI orchestration domain now persists the governed multi-agent plan as a workspace-scoped graph. An orchestration run stores its objective, evidence references, deterministic plan hash, lifecycle status, and creator. Each planned role is stored as a node with task key, role, objective, dependency list, status, observation payload, and evidence hash.

## Persistence contract

| Requirement | Implementation |
|---|---|
| Workspace isolation | Both `orchestrationRuns` and `orchestrationNodes` carry workspace identity and foreign-key boundaries. |
| Deterministic plan | `planMultiAgentRun` creates ordered scope/evidence/risk/report tasks; `planHash` binds the persisted plan. |
| Dependency graph | Each node stores `dependsOn` as a JSON array of task keys. |
| Lifecycle | Run: queued/running/completed/failed/needs_review/cancelled. Node: queued/blocked/running/completed/failed/needs_review. |
| Evidence | A node cannot transition to `completed` without a 64-character SHA-256 evidence hash. |
| Terminal safety | Completed and failed nodes cannot transition again. |
| Provider boundary | Persistence and planning work without a live model provider; provider execution remains behind the existing governed AI runtime. |
| Auditability | Objective, evidence references, plan hash, observations, status, and timestamps are retained. |

The authenticated procedures are `orchestration.create`, `orchestration.get`, and `orchestration.setNodeStatus`. They require workspace authorization and do not provide a target-facing execution path. The `0083_orchestration_run_graph.sql` migration creates the durable graph tables.
