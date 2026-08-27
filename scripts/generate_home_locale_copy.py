import json
from pathlib import Path

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
SOURCE = {
    "eyebrow": "Authorized security research · internal command interface",
    "title": "Command Center",
    "description": "A governed control plane for scoped workspaces. Rehearsals remain fully offline; every future action is evaluated by deterministic safety policy before it can proceed.",
    "activeWorkspaces": "Active workspaces",
    "pendingApprovals": "Pending approvals",
    "policyBlocks": "Policy blocks",
    "validatedFindings": "Validated findings",
    "recordedSpend": "Recorded spend",
    "rehearsalEyebrow": "Network-zero rehearsal",
    "rehearsalTitle": "Plan safely before anything else",
    "dryRunOnly": "Dry-run only",
    "scopeGate": "Scope + conduct gate",
    "scopeGateDetail": "The declared allowlist and exclusions are evaluated deterministically.",
    "noTargetInteraction": "No target interaction",
    "noTargetInteractionDetail": "Network calls and tool executions remain fixed at zero for every rehearsal.",
    "budgetSession": "Budget + session checks",
    "budgetSessionDetail": "Estimates are blocked if the workspace budget or session ceiling is exhausted.",
    "hypotheticalMap": "Hypothetical task map",
    "hypotheticalMapDetail": "Only policy, asset-graph, and coverage planning tasks are generated.",
    "selectGuardedWorkspace": "Select guarded workspace",
    "createWorkspaceToBegin": "Create a workspace to begin",
    "startRehearsal": "Start rehearsal",
    "rehearsing": "Rehearsing…",
    "telemetryEyebrow": "Operational telemetry",
    "coverageLens": "Coverage lens",
    "coverageDescription": "Coverage indicators remain empty until a governed run records eligible, reviewable evidence.",
    "scopeGovernance": "Scope governance",
    "programContext": "Program context",
    "hypothesisPlanning": "Hypothesis planning",
    "findingValidation": "Finding validation",
    "noModelNoContact": "No model execution · no external target contact",
    "runLedger": "Run ledger",
    "latestActivity": "Latest governed activity",
    "noActivity": "No governed activity has been recorded yet.",
}
LOCALES = {"id": "Indonesian", "ms": "Malay", "ar": "Arabic", "zh-CN": "Simplified Chinese", "ja": "Japanese", "ko": "Korean", "es": "Spanish", "pt": "Portuguese", "fr": "French", "de": "German", "ru": "Russian"}
SCHEMA = {"name": "translations", "strict": True, "schema": {"type": "object", "properties": {key: {"type": "string"} for key in SOURCE}, "required": list(SOURCE), "additionalProperties": False}}

client = OpenAI()
result = {key: {"en": value} for key, value in SOURCE.items()}
for code, language in LOCALES.items():
    response = client.chat.completions.create(
        model="gpt-5-mini",
        messages=[
            {"role": "system", "content": "You translate cybersecurity governance interface labels. Preserve safety meanings: dry-runs never contact targets, and policy gates require human control. Return only the requested JSON."},
            {"role": "user", "content": f"Translate these English UI strings into {language}. Keep product names, SHA-256, URLs, codes, and variable values unchanged.\n{json.dumps(SOURCE, ensure_ascii=False)}"},
        ],
        response_format={"type": "json_schema", "json_schema": SCHEMA},
        max_completion_tokens=8000,
    )
    translations = json.loads(response.choices[0].message.content)
    for key, value in translations.items():
        result[key][code] = value

target = ROOT / "client/src/locales/home-copy.json"
target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(result)} explicit command-center keys to {target}")
