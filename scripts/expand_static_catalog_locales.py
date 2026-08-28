import concurrent.futures
import json
from pathlib import Path

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
TARGETS = {"hi": "Hindi", "vi": "Vietnamese", "th": "Thai", "tr": "Turkish", "pl": "Polish", "nl": "Dutch", "it": "Italian", "sv": "Swedish"}
path = ROOT / "client/src/locales/curated-translations.json"
catalog = json.loads(path.read_text(encoding="utf-8"))
source = {key: key for key in catalog}

def schema():
    return {"type": "json_schema", "json_schema": {"name": "static_catalog_locale", "strict": True, "schema": {"type": "object", "properties": {key: {"type": "string"} for key in source}, "required": list(source), "additionalProperties": False}}}

def translate(item):
    code, language = item
    response = OpenAI().chat.completions.create(model="gpt-5-mini", messages=[
        {"role": "system", "content": "Translate curated, static interface labels for a security-governance control plane into the requested language. Keep source code, hashes, URLs, IDs, and product names unchanged. Preserve non-execution safety meanings. Return natural UI text only in JSON; do not append English explanations or invent functionality."},
        {"role": "user", "content": f"Translate all values into {language}:\n{json.dumps(source, ensure_ascii=False)}"},
    ], response_format=schema(), max_completion_tokens=18000)
    return code, json.loads(response.choices[0].message.content)

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    for code, values in executor.map(translate, TARGETS.items()):
        for key, value in values.items(): catalog[key][code] = value
path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Expanded {len(catalog)} curated static phrases to 20 locales.")
