# AngelMind Execution Vertical Slice

This document defines the repository-level closure path for governed research execution.

## Canonical flow

`workspace → research session → asset/scope → task → approval (when required) → tool adapter → raw output → observation/evidence → finding → report`

## Current repository contracts

- Workspace creation requires safe-harbor, code-of-conduct, and a non-empty allowlist.
- Research sessions expose assets, observations, hypotheses, and tasks.
- Tool catalog contains the canonical 17-tool set and runtime adapters.
- Target execution is fail-closed unless `ANGELMIND_ENABLE_TARGET_EXECUTION=true` is explicitly configured.
- Target-facing execution must pass workspace authorization and allowlist/exclusion validation.
- High/critical tools require an approved governance record; a client-provided boolean is not sufficient authorization.
- Critical privileged/destructive mode remains restricted by the tool catalog policy.
- Evidence has provenance and promotion states before it becomes reportable.
- Findings have explicit workflow transitions and human review state.
- Report versions are persisted against findings and workspaces.
- Audit records are emitted around governance and workflow transitions.

## Launch-readiness interpretation

Repository CI proves code contracts, tests, migrations, and builds. It does **not** prove a deployed runtime has every external/vendor artifact available. Burp Suite Professional remains an external/vendor artifact and must never be represented as installed merely because its adapter exists.

Production target execution, backup/restore evidence, deployment promotion, and live tool verification remain deployment-stage gates until Railway is intentionally enabled.
