# Domain 13 — AI & Automation

Blueprint V4 implementation contract.

## LLM Gateway

Model selection uses the registered AI platform catalog. Routing fails closed when a suitable registered model is unavailable or degraded execution is not allowed.

## Prompt Registry

Prompts are versioned by name. A new version becomes active while prior versions remain available for audit and reproducibility.

## AI Budget

Each autonomous worker has an explicit budget ceiling in cents and a bounded timeout. A requested estimated cost above the worker budget is rejected.

## Autonomous Workers

Workers are scoped to a workspace and have one of four roles: research, analysis, triage, or report. Workers can be enabled or disabled independently.

## Execution Modes

Simulation is the default mode and produces synthetic `simulation://` output without external target impact. Governed mode may create a queued run, but provider-side execution remains behind the normal authorization, approval, scope, and audit pipeline.

## Safety and Audit

Automation that can cause external impact must inherit workspace scope, policy, approval and audit controls. The automation catalog exposes this boundary explicitly as `approval-and-audit-required`. No unrestricted target-facing execution is provided by this domain.
