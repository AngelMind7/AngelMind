# Domain 08 — Purple Team Collaboration

Implements the AngelMind V4.0 Purple Team domain: joint red/blue exercise planning, scenario library with ATT&CK technique mapping, detection-rule registration, detection-gap analysis, and an improvement track with measurable coverage/MTTD/dwell metrics.

## Governance

Exercises are governed simulations. They require workspace access, explicit planning, approval, and an auditable rules-of-engagement statement before execution. The service does not provide unrestricted offensive execution; exercise results are synthetic validation evidence for defensive detection coverage.

## Workflow

`draft → planned → approved → running → completed`

A scenario defines synthetic techniques. Running an approved exercise produces executed/detected/missed counts, coverage percentage, mean time to detect, and dwell time. Improvement items track remediation and detection enhancements through `open → in_progress → verified → closed`.

## Detection Rules

The registry supports the blueprint's Sigma, YARA, and Lua rule categories. Rule content is stored as a detection artifact and is not automatically executed against external targets.

## API

The domain exposes exercise list/create/get, plan, approve, run, gap, improvement, scenario, and detection-rule endpoints under `/api/v1/purpleteam`.
