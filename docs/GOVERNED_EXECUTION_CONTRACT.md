# Governed Execution Contract

The server-side execution path is intentionally layered:

`Capability → Adapter health → Exact-tool authorization → Runtime → Parse → Normalize → Observation → Correlation`

The planning layer (`execution-orchestrator.ts`) is not an authorization authority. The final gate is `authorizeToolExecution()` immediately before `executeToolPipeline()`.

## Safety invariants

- Unknown capabilities fail closed.
- Unknown tools fail closed.
- Target-facing execution requires a validated target and scope.
- High and critical tools require a server-verified approval record.
- Target execution remains disabled unless the explicit runtime opt-in is enabled.
- A failed primary adapter may use its declared fallback only when the fallback is healthy.
- No runtime target is accepted from the client as proof of authorization.
- Completed runtime output is hashed before normalization/persistence.

## Pipeline state

The canonical execution state machine remains the source of truth for the full lifecycle:

`INIT → RECON → FINGERPRINT → VECTOR_SELECTION → POLICY_CHECK → APPROVAL_GATE → QUEUE → WORKER_EXECUTION → PARSER → NORMALIZER → OBSERVATION → EVIDENCE → FINDING → CORRELATION → CHAIN_VALIDATION → IMPACT_PROOF → REPORT_GENERATION → SUBMISSION → DONE`

The current governed capability service covers the adapter-selection and runtime/evidence boundary. Later stages must continue to use the same research/session context rather than bypassing policy.
