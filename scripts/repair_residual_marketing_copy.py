import concurrent.futures
import json
import re
from pathlib import Path

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
TARGETS = {"id": "Indonesian", "ms": "Malay", "ar": "Arabic", "zh-CN": "Simplified Chinese", "ja": "Japanese", "ko": "Korean", "es": "Spanish", "pt": "Portuguese", "fr": "French", "de": "German", "ru": "Russian", "hi": "Hindi", "vi": "Vietnamese", "th": "Thai", "tr": "Turkish", "pl": "Polish", "nl": "Dutch", "it": "Italian", "sv": "Swedish"}
RESIDUAL = re.compile(r"no target contact|no autonomous submission|no external delivery|no unverified claims", re.I)
path = ROOT / "client/src/locales/marketing-copy.json"
resource = json.loads(path.read_text(encoding="utf-8"))

def translate(code, language, source):
    schema = {"type": "json_schema", "json_schema": {"name": "public_copy_repair", "strict": True, "schema": {"type": "object", "properties": {key: {"type": "string"} for key in source}, "required": list(source), "additionalProperties": False}}}
    response = OpenAI().chat.completions.create(model="gpt-5-mini", messages=[{"role": "system", "content": "Translate these public safety interface strings naturally and completely into the target language. Do not leave, quote, append, or repeat English phrases. Preserve only the brand AngelMind in English. Preserve all safety meanings: no target contact/testing, no autonomous submission, no external delivery, and no unverified claims. Return JSON only."}, {"role": "user", "content": f"Translate to {language}:\n{json.dumps(source, ensure_ascii=False)}"}], response_format=schema, max_completion_tokens=6000)
    return code, json.loads(response.choices[0].message.content)

jobs = []
for code, language in TARGETS.items():
    source = {key: values["en"] for key, values in resource.items() if RESIDUAL.search(values.get(code, ""))}
    if source: jobs.append((code, language, source))
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    for code, values in executor.map(lambda job: translate(*job), jobs):
        for key, value in values.items(): resource[key][code] = value
path.write_text(json.dumps(resource, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Repaired {len(jobs)} locale resources with residual English fragments.")
