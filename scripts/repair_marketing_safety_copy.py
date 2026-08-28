import concurrent.futures
import json
from pathlib import Path

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
TARGETS = {"id": "Indonesian", "ms": "Malay", "ar": "Arabic", "zh-CN": "Simplified Chinese", "ja": "Japanese", "ko": "Korean", "es": "Spanish", "pt": "Portuguese", "fr": "French", "de": "German", "ru": "Russian", "hi": "Hindi", "vi": "Vietnamese", "th": "Thai", "tr": "Turkish", "pl": "Polish", "nl": "Dutch", "it": "Italian", "sv": "Swedish"}
KEYS = ["marketing.security.description", "marketing.safety.title", "marketing.safety.description"]

def schema(source):
    return {"type": "json_schema", "json_schema": {"name": "safety_copy", "strict": True, "schema": {"type": "object", "properties": {key: {"type": "string"} for key in source}, "required": list(source), "additionalProperties": False}}}

def repair(item, source):
    code, language = item
    response = OpenAI().chat.completions.create(model="gpt-5-mini", messages=[
        {"role": "system", "content": "You translate safety-critical public interface text. Produce natural, complete text entirely in the target language; do not retain or append English phrases. Keep only the brand AngelMind in English. Preserve these meanings exactly: no target testing/contact, no autonomous submission, no external delivery, no hidden bypass, and no remote test execution. Return JSON only."},
        {"role": "user", "content": f"Translate into {language}:\n{json.dumps(source, ensure_ascii=False)}"},
    ], response_format=schema(source), max_completion_tokens=3000)
    return code, json.loads(response.choices[0].message.content)

path = ROOT / "client/src/locales/marketing-copy.json"
resource = json.loads(path.read_text(encoding="utf-8"))
source = {key: resource[key]["en"] for key in KEYS}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    for code, values in executor.map(lambda item: repair(item, source), TARGETS.items()):
        for key, value in values.items(): resource[key][code] = value
path.write_text(json.dumps(resource, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Repaired safety-critical public copy in 19 non-English locales.")
