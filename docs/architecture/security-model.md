# AngelMind V4.0 — Security Model

The security model is layered across identity, tenant isolation, scoped API keys, rate limits, policy evaluation, approval workflow, execution resource gates, evidence provenance, tamper-evident audit records and recovery procedures.

## Mandatory controls
- Authentication and session lifecycle.
- RBAC/ABAC plus workspace and target scope checks.
- Explicit authorization and policy evaluation before target-facing actions.
- Human approval for high-risk actions.
- Fail-closed resource/runtime gates.
- Idempotency and cancellation for durable jobs.
- Evidence provenance and audit-chain metadata.
- Retention, export, deletion and legal-hold controls.
- No production credentials or live provider secrets in Git.

## UTF safety
The blueprint names offensive modules including exploitation, C2, phishing and post-exploitation. In this repository those high-risk families are represented as governed/simulation-only adapters unless a separate deployment policy explicitly authorizes a supported safe workflow. The registry must not make such modules executable merely by naming them.

## Verification
Pre-release checks cover authentication bypass, tenant isolation, scope enforcement, governance bypass, audit integrity, runtime resource limits and secret scanning. Load, accessibility and disaster-recovery checks are release gates where the required test infrastructure is available.
