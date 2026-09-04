# AngelMind Master Implementation Matrix

This matrix is the repository-facing execution checklist for the active AngelMind master specification.

## Non-negotiable product pipeline

`Frontend → API → Authorization → Service → Data/Queue → Execution → Result → Persistence → Observability → Audit → Test`

Every production feature must have UI, API contract, authentication/authorization, backend logic, persistence, execution where applicable, audit/observability, and automated tests. Mocks are restricted to automated tests.

## System domains

- Identity / authentication / sessions
- Organization / workspace / membership
- Projects / security programs / authorization references / scopes
- Assets / asset relationships
- Research / hypotheses / tasks
- Capability registry and adapter selection
- Tool registry/runtime for the canonical 17 tools
- Execution / jobs / workers / sandbox controls
- AI gateway / routing / failover / usage
- Observation / evidence / provenance / redaction
- Findings / severity / lifecycle / remediation
- Correlation engine and chain validation
- Knowledge graph
- Reports
- Audit / notifications
- Frontend dashboard and realtime state

## Canonical execution state

`INIT → RECON → FINGERPRINT → VECTOR_SELECTION → POLICY_CHECK → APPROVAL_GATE → QUEUE → WORKER_EXECUTION → PARSER → NORMALIZER → OBSERVATION → EVIDENCE → FINDING → CORRELATION → CHAIN_VALIDATION → IMPACT_PROOF → REPORT_GENERATION → SUBMISSION → DONE`

High/critical execution must stop at approval. AI recommendations never grant authorization.

## Canonical 17 tools

1. Burp Suite Professional
2. jwt_tool
3. Dalfox
4. SSRFmap
5. Interactsh
6. ffuf
7. CloudFox
8. Gitleaks
9. graphql-cop + InQL
10. sqlmap
11. Nuclei
12. Subfinder
13. httpx
14. Trivy
15. naabu
16. katana
17. Custom Scripts

Each tool requires: identity, source/version/license evidence, runtime/dependencies, manifest, adapter, parser/normalizer path, health, scope integration, policy integration, execution test, cleanup, and audit.

## Capability registry

- jwt-analysis → jwt_tool → Burp fallback
- token-manipulation → jwt_tool → Burp fallback
- crypto-testing → jwt_tool → Burp fallback
- sql-injection-testing → sqlmap → Burp fallback
- ssrf-testing → SSRFmap → Burp fallback
- graphql-introspection → graphql-cop → Burp fallback
- graphql-batching-testing → graphql-cop → Burp fallback
- secret-detection → Gitleaks
- cloud-metadata-testing → CloudFox → SSRFmap fallback
- iam-analysis → CloudFox
- dependency-scanning → Trivy
- dns-enumeration → Subfinder
- cve-scanning → Nuclei
- parameter-manipulation → ffuf → Burp fallback
- template-injection-testing → Custom Scripts
- file-upload-testing → Burp → Custom Scripts fallback
- port-discovery → naabu
- endpoint-mining → katana

## Evidence pipeline

`Raw Tool Output → Parser → Normalizer → Observation → Evidence → Finding`

Evidence must preserve provenance/integrity metadata and apply secret redaction. Findings must remain auditable and traceable back to evidence/execution.

## Correlation

The master defines 37 sequential and 10 compound correlation rules plus severity overrides. Correlation can create follow-up tasks, raise priority, and escalate approval requirements, but cannot bypass scope or policy.

## Tenant isolation

For tenant-sensitive records, workspace context is mandatory in the service/repository boundary. Workspace IDs supplied by an untrusted request body are not authorization context. Cross-tenant access must be covered by automated tests.

## Dashboard truth rule

Displayed values must originate from real persisted/runtime state. No fake counters, fake status, fake tool state, fake AI responses, or hardcoded production findings.

## Release semantics

- `IMPLEMENTED`: repository code exists for the requirement.
- `VERIFIED`: automated repository contract/tests pass.
- `DEPLOYED`: observed in the intended runtime environment.

Repository work must not claim deployment evidence that does not exist.

## Implementation progress

The repository now treats the tool execution policy as a server-side authorization boundary. The remaining work is to connect the governed execution decision to the research/task execution path and then persist normalized observations, evidence, findings, correlation, and report state as one traceable transaction chain.
