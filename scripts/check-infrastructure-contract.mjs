import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const failures = [];
const read = file => readFileSync(resolve(root, file), "utf8");
const requireFile = file => {
  if (!existsSync(resolve(root, file))) failures.push(`missing infrastructure contract file: ${file}`);
};
const requireMarker = (file, marker) => {
  if (!existsSync(resolve(root, file)) || !read(file).includes(marker)) {
    failures.push(`missing ${marker} in ${file}`);
  }
};

// V4 infrastructure surface: GitHub Actions + Cloudflare + Supabase + Railway + Firebase.
const platforms = ["github", "cloudflare", "supabase", "railway", "firebase"];
requireFile(".github/workflows/ci.yml");
requireFile(".github/workflows/blueprint-gate.yml");
requireFile("railway.json");
requireFile("infrastructure/cloudflare/wrangler.toml");
requireFile("infrastructure/cloudflare/src/index.ts");
requireFile("infrastructure/supabase/config.toml");
requireFile("infrastructure/firebase/firebase.json");
requireFile("infrastructure/firebase/.firebaserc");
requireFile("infrastructure/firebase/firestore.rules");
requireFile("infrastructure/firebase/firestore.indexes.json");
requireFile("infrastructure/firebase/functions/index.js");
requireFile("infrastructure/firebase/public/index.html");

requireMarker(".github/workflows/ci.yml", "pnpm install --frozen-lockfile");
requireMarker(".github/workflows/blueprint-gate.yml", "check-master-contract.mjs");
requireMarker("railway.json", "healthcheckPath");
requireMarker("infrastructure/cloudflare/wrangler.toml", "workers_dev");
requireMarker("infrastructure/cloudflare/src/index.ts", "fetch");
requireMarker("infrastructure/supabase/config.toml", "[api]");
requireMarker("infrastructure/firebase/firebase.json", "functions");
requireMarker("infrastructure/firebase/firestore.rules", "match /databases/{database}/documents");
requireMarker("infrastructure/firebase/functions/index.js", "exports");

if (platforms.length < 5) failures.push(`V4 infrastructure platform count: expected 5, found ${platforms.length}`);
if (failures.length) {
  console.error("Infrastructure contract check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Infrastructure contract OK: ${platforms.length} platforms (${platforms.join(", ")}) with repository configuration and CI contracts present.`);
