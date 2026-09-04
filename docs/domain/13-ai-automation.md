# Domain 13 — AI & Automation

Blueprint V4 implementation contract.

## Modules
- LLM Gateway: multi-provider routing and failover.
- AI Providers and Models: connection, health and model registry.
- Prompt Registry: prompts and version history.
- AI Usage: token and cost tracking.
- AI Budget: warning at 80% and hard limit at 100%.
- Autonomous Workers: identity, role, model, budget, timeout and execution history.

Automation that can cause external impact must inherit workspace scope, policy, approval and audit controls.
