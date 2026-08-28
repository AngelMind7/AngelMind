import concurrent.futures
import json
from pathlib import Path

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
TARGETS = {"id": "Indonesian", "ms": "Malay", "ar": "Arabic", "zh-CN": "Simplified Chinese", "ja": "Japanese", "ko": "Korean", "es": "Spanish", "pt": "Portuguese", "fr": "French", "de": "German", "ru": "Russian", "hi": "Hindi", "vi": "Vietnamese", "th": "Thai", "tr": "Turkish", "pl": "Polish", "nl": "Dutch", "it": "Italian", "sv": "Swedish"}
SOURCE = {"api.eyebrow": "Read-only API Playground", "api.title": "Explore safe control-plane contracts.", "api.description": "Synthetic examples only. This page never stores credentials, contacts targets, or sends a request.", "api.endpoint": "Contract example", "api.request": "Illustrative request", "api.response": "Illustrative response", "api.badge": "Synthetic only", "api.notice.title": "No live execution", "api.notice.body": "Copy is disabled by design. Production API access, credentials, and mutations are not available from this public surface.", "api.example.rehearsal": "Offline rehearsal plan", "api.example.policy": "Policy gate decision", "api.example.audit": "Audit archive status"}

def schema(): return {"type": "json_schema", "json_schema": {"name": "api_playground_locale", "strict": True, "schema": {"type": "object", "properties": {key: {"type": "string"} for key in SOURCE}, "required": list(SOURCE), "additionalProperties": False}}}
def translate(item):
    code, language = item
    response = OpenAI().chat.completions.create(model="gpt-5-mini", messages=[{"role": "system", "content": "Translate reviewed public interface copy for a security governance product. Use natural target-language text with no residual English fragments except AngelMind. Preserve safety meanings exactly: synthetic examples only, no credentials, no target contact, no request sending, and no live execution. Return JSON only."}, {"role": "user", "content": f"Translate into {language}:\n{json.dumps(SOURCE, ensure_ascii=False)}"}], response_format=schema(), max_completion_tokens=5000)
    return code, json.loads(response.choices[0].message.content)
result = {key: {"en": value} for key, value in SOURCE.items()}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    for code, values in executor.map(translate, TARGETS.items()):
        for key, value in values.items(): result[key][code] = value
(ROOT / "client/src/locales/api-playground-copy.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Wrote API Playground copy in 20 locales.")
