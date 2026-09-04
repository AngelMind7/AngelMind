# Domain 10 — Findings & Evidence

Blueprint V4 implementation contract.

## Modules
- Finding lifecycle: Open → Validate/Confirmed → Fix → Retest → Close, with reopen and false-positive states.
- Evidence Vault: immutable evidence records, files and hashes.
- Chain of Custody: actor, timestamp and transfer history.
- Severity Engine: CVSS v3.1, custom scoring and business impact.
- Remediation: fix guidance and verification tracking.
- False Positive: analysis and feedback loop.
- Duplicate Detection: finding clustering and match records.

Evidence must preserve provenance from Finding → Evidence → Observation → Execution → Tool → Research.
