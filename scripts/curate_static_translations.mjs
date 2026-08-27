import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = JSON.parse(await readFile(path.join(root, "client/src/locales/static-translations.json"), "utf8"));
const locales = ["id", "ms", "ar", "zh-CN", "ja", "ko", "es", "pt", "fr", "de", "ru"];
const isUiPhrase = phrase => phrase.length > 1 && phrase.length < 240 && /[A-Za-z]/.test(phrase) && !/(=>|\bconst\b|\breturn\b|\buseState\b|\buseQuery\b|@nextjs|[{};]|= MIN_WIDTH|\[.*\])/.test(phrase);
const curated = Object.fromEntries(Object.entries(source).filter(([phrase, values]) => isUiPhrase(phrase) && locales.every(locale => typeof values?.[locale] === "string" && values[locale].trim())));
await writeFile(path.join(root, "client/src/locales/curated-translations.json"), JSON.stringify(curated, null, 2) + "\n");
console.log(`Curated ${Object.keys(curated).length} interface phrases.`);
