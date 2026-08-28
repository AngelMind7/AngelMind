import concurrent.futures
import json
from pathlib import Path

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
TARGETS = {"hi": "Hindi", "vi": "Vietnamese", "th": "Thai", "tr": "Turkish", "pl": "Polish", "nl": "Dutch", "it": "Italian", "sv": "Swedish"}
SHARED = {
    "nav.controlPlane": "Control plane", "nav.commandCenter": "Command center", "nav.workspaces": "Workspaces", "nav.governance": "Governance", "nav.findings": "Findings", "nav.audit": "Evidence & audit", "nav.observability": "Observability", "nav.operations": "Operations console", "nav.assurance": "Assurance control", "nav.notifications": "Notifications", "nav.menu": "Menu", "auth.signIn": "Sign in", "auth.signOut": "Sign out", "auth.signInTitle": "Sign in to continue", "auth.signInText": "Access to this dashboard requires authentication. Continue to launch the login flow.", "locale.language": "Language", "locale.timeZone": "Time zone", "common.selectWorkspace": "Select workspace", "common.approve": "Approve", "common.reject": "Reject", "common.create": "Create", "common.resolve": "Resolve", "common.link": "Link", "status.pending": "Pending", "status.disabled": "Disabled",
}

def schema_for(source):
    return {"type": "json_schema", "json_schema": {"name": "locale_resource", "strict": True, "schema": {"type": "object", "properties": {key: {"type": "string"} for key in source}, "required": list(source), "additionalProperties": False}}}

def translate(source, language):
    response = OpenAI().chat.completions.create(
        model="gpt-5-mini",
        messages=[
            {"role": "system", "content": "You translate reviewed cybersecurity governance interface copy. Preserve its non-execution safety meaning: no target contact, external delivery remains disabled, and human review remains mandatory where stated. Do not invent capability claims. Return only JSON."},
            {"role": "user", "content": f"Translate the following interface resource into {language}. Keep names, HTTPS, SHA-256, URLs, IDs, hashes, variables, and code unchanged.\n{json.dumps(source, ensure_ascii=False)}"},
        ],
        response_format=schema_for(source),
        max_completion_tokens=16000,
    )
    return json.loads(response.choices[0].message.content)

def main():
    resources = {
        ROOT / "client/src/locales/shared-expansion.json": SHARED,
        ROOT / "client/src/locales/home-copy.json": {key: value["en"] for key, value in json.loads((ROOT / "client/src/locales/home-copy.json").read_text(encoding="utf-8")).items()},
        ROOT / "client/src/locales/assurance-notifications-copy.json": {key: value["en"] for key, value in json.loads((ROOT / "client/src/locales/assurance-notifications-copy.json").read_text(encoding="utf-8")).items()},
    }
    for destination, source in resources.items():
        existing = json.loads(destination.read_text(encoding="utf-8")) if destination.exists() else {}
        result = {key: {**existing.get(key, {}), "en": value} for key, value in source.items()}
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            translated = list(executor.map(lambda item: (item[0], translate(source, item[1])), TARGETS.items()))
        for code, values in translated:
            for key, value in values.items(): result[key][code] = value
        destination.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote {destination.name} with {len(result)} keys in 9 locales.")

if __name__ == "__main__":
    main()
