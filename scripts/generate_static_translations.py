import json
import os
import re
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
CLIENT = ROOT / "client" / "src"
OUT = CLIENT / "locales" / "static-translations.json"
LOCALES = ["id", "ms", "ar", "zh-CN", "ja", "ko", "es", "pt", "fr", "de", "ru"]
SKIP = {"components/ui", "contexts", "_core"}

def static_copy(text: str):
    candidates = []
    candidates += re.findall(r">([^<>{}\n][^<>{}\n]{1,180})<", text)
    candidates += re.findall(r"(?:placeholder|aria-label|title)=\"([^\"]{2,180})\"", text)
    candidates += re.findall(r"toast\.(?:success|error|message)\(\"([^\"]{2,220})\"", text)
    values = []
    for value in candidates:
        normalized = " ".join(value.strip().split())
        code_fragment = re.search(r"(?:\bconst\b|\breturn\b|=>|useState|useQuery|\.data\b|\(|\)|;|\{|\}|\[|\])", normalized)
        if len(normalized) > 1 and re.search(r"[A-Za-z]", normalized) and not code_fragment and not normalized.startswith(("http", "sha256")):
            values.append(normalized)
    return values

phrases = []
for file in CLIENT.rglob("*.tsx"):
    relative = file.relative_to(CLIENT).as_posix()
    if any(relative.startswith(prefix) for prefix in SKIP):
        continue
    phrases.extend(static_copy(file.read_text(encoding="utf-8")))

# Include central locale labels that may not be statically rendered on every page.
phrases.extend(["Control plane", "Command center", "Workspaces", "Governance", "Findings", "Evidence & audit", "Observability", "Operations console", "Assurance control", "Notifications", "Language", "Sign in", "Sign out"])
phrases = sorted(set(phrases))[:120]

prompt = """Translate each exact AngelMind internal-dashboard UI phrase into the requested locales. Preserve product name ANGELMIND, technical terms like SHA-256, URL, HTTP, HTTPS, webhook, Tier 1/2/3, and placeholders/variables exactly. Do not add explanations. Return a JSON object whose keys are the English phrases and whose values are objects containing only the locale keys listed below.\n\nLocales: %s\n\nPhrases:\n%s""" % (", ".join(LOCALES), json.dumps(phrases, ensure_ascii=False))
valid = {}
for offset in range(0, len(phrases), 20):
    batch = phrases[offset:offset + 20]
    batch_prompt = """Translate each exact AngelMind internal-dashboard UI phrase into the requested locales. Preserve product name ANGELMIND, technical terms like SHA-256, URL, HTTP, HTTPS, webhook, Tier 1/2/3, and placeholders/variables exactly. Do not add explanations. Return a valid JSON object only, with each English phrase as a key and an object containing all locale keys.\n\nLocales: %s\n\nPhrases:\n%s""" % (", ".join(LOCALES), json.dumps(batch, ensure_ascii=False))
    response = requests.post(
        os.environ["OPENAI_API_BASE"].rstrip("/") + "/chat/completions",
        headers={"Authorization": "Bearer " + os.environ["OPENAI_API_KEY"], "Content-Type": "application/json"},
        json={"model": "gpt-5-mini", "messages": [{"role": "system", "content": "You are a precise localization engineer. Return a valid JSON object only, with no Markdown."}, {"role": "user", "content": batch_prompt}], "max_completion_tokens": 8000},
        timeout=120,
    )
    if not response.ok:
        raise RuntimeError(f"Translation request failed in batch {offset // 20 + 1}: {response.status_code} {response.text[:800]}")
    payload = json.loads(response.json()["choices"][0]["message"]["content"])
    valid.update({phrase: {locale: str(values.get(locale, phrase)) for locale in LOCALES} for phrase, values in payload.items() if phrase in batch and isinstance(values, dict)})
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(valid, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
print(f"Wrote {len(valid)} translated UI phrases to {OUT}")
