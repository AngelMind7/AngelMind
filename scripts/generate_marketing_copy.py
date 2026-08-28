import concurrent.futures
import json
from pathlib import Path

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
TARGETS = {"id": "Indonesian", "ms": "Malay", "ar": "Arabic", "zh-CN": "Simplified Chinese", "ja": "Japanese", "ko": "Korean", "es": "Spanish", "pt": "Portuguese", "fr": "French", "de": "German", "ru": "Russian", "hi": "Hindi", "vi": "Vietnamese", "th": "Thai", "tr": "Turkish", "pl": "Polish", "nl": "Dutch", "it": "Italian", "sv": "Swedish"}
SOURCE = {
    "marketing.nav.features": "Features", "marketing.nav.docs": "Docs", "marketing.nav.trust": "Trust Center", "marketing.nav.security": "Security", "marketing.nav.signIn": "Sign in", "marketing.cta.open": "Open control plane", "marketing.cta.read": "Read operating model",
    "marketing.product.eyebrow": "Governed security research operations", "marketing.product.title": "AngelMind keeps research decisions accountable.", "marketing.product.description": "A safety-first control plane for authorized research workspaces, deterministic policy, offline rehearsal, human approval, and evidence-led delivery.",
    "marketing.features.eyebrow": "Product capabilities", "marketing.features.title": "Structure every decision before it matters.", "marketing.features.description": "Scope, policy, budget, roles, findings, evidence, and assurance controls stay connected through auditable workflow records.",
    "marketing.trust.eyebrow": "Trust Center", "marketing.trust.title": "Controls you can inspect, not claims you must accept.", "marketing.trust.description": "Review the implemented safety boundaries, retention posture, audit evidence model, and responsible disclosure approach.",
    "marketing.docs.eyebrow": "Documentation", "marketing.docs.title": "A clear operating model for governed research.", "marketing.docs.description": "Explore the architecture, safe workflow, localization model, and phased delivery specification for AngelMind.",
    "marketing.security.eyebrow": "Security disclosure", "marketing.security.title": "Report responsibly. Preserve evidence. Keep people safe.", "marketing.security.description": "Security reports are handled through a governed, evidence-aware workflow. This public page never enables target testing or external delivery.",
    "marketing.safety.eyebrow": "Safety boundary", "marketing.safety.title": "No target contact. No autonomous submission. No hidden bypass.", "marketing.safety.description": "AngelMind is an operational control plane. It supports governed planning, review, evidence, and audit—not remote testing execution.",
    "marketing.pillar.guard.title": "Deterministic guardrails", "marketing.pillar.guard.body": "Scope, conduct, budget, session, and tier checks are evaluated before a workflow state can advance.", "marketing.pillar.evidence.title": "Evidence-led governance", "marketing.pillar.evidence.body": "Policies, decisions, incidents, and artifact references are retained in workspace-scoped audit records.", "marketing.pillar.rehearsal.title": "Offline rehearsal", "marketing.pillar.rehearsal.body": "Planning remains network-zero. The interface does not run target-facing tools or direct external actions.",
    "marketing.scope.eyebrow": "Published scope", "marketing.scope.title": "Transparent by design.", "marketing.scope.implemented.title": "Implemented controls", "marketing.scope.implemented.body": "Workspace isolation, role checks, policy versions, approval gates, audit references, incident workflow, and notification records.", "marketing.scope.standard.title": "Public content standard", "marketing.scope.standard.body": "No fabricated reviews, certification badges, customer metrics, or security claims. Public material is reviewed and evidence-backed.", "marketing.footer": "AngelMind · governed, evidence-led research operations",
}

def response_schema():
    return {"type": "json_schema", "json_schema": {"name": "marketing_locale", "strict": True, "schema": {"type": "object", "properties": {key: {"type": "string"} for key in SOURCE}, "required": list(SOURCE), "additionalProperties": False}}}

def translate(item):
    code, language = item
    response = OpenAI().chat.completions.create(model="gpt-5-mini", messages=[
        {"role": "system", "content": "Translate controlled public product interface copy. Preserve every safety boundary exactly: no target contact, no autonomous submission, no external delivery, and no unverified claims. Do not add marketing claims. Keep AngelMind unchanged. Return JSON only."},
        {"role": "user", "content": f"Translate to {language}:\n{json.dumps(SOURCE, ensure_ascii=False)}"},
    ], response_format=response_schema(), max_completion_tokens=14000)
    return code, json.loads(response.choices[0].message.content)

result = {key: {"en": value} for key, value in SOURCE.items()}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    for code, values in executor.map(translate, TARGETS.items()):
        for key, value in values.items(): result[key][code] = value
(ROOT / "client/src/locales/marketing-copy.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(result)} marketing keys for 20 locales.")
