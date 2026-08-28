import { readFile, writeFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = JSON.parse(await readFile(path.join(root, "client/src/locales/static-translations.json"), "utf8"));
const locales = ["id", "ms", "ar", "zh-CN", "ja", "ko", "es", "pt", "fr", "de", "ru"];
const sourceFiles = [];
for await (const file of glob("client/src/**/*.{tsx,ts}", { cwd: root })) sourceFiles.push(file);
const applicationText = (await Promise.all(sourceFiles.map(file => readFile(path.join(root, file), "utf8")))).join("\n");
const isUiPhrase = phrase => phrase.length > 1 && phrase.length < 240 && /^[A-Za-z][A-Za-z0-9 .,:!?&'’/()\-]+$/.test(phrase) && !/(=>|\bconst\b|\breturn\b|\buseState\b|\buseQuery\b|repository|aspect ratio|invoice|[{};@]|= MIN_WIDTH|\[.*\])/.test(phrase);
const curated = Object.fromEntries(Object.entries(source).filter(([phrase, values]) => isUiPhrase(phrase) && applicationText.includes(phrase) && locales.every(locale => typeof values?.[locale] === "string" && values[locale].trim())));
await writeFile(path.join(root, "client/src/locales/curated-translations.json"), JSON.stringify(curated, null, 2) + "\n");
console.log(`Curated ${Object.keys(curated).length} interface phrases.`);
