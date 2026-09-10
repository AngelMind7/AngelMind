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
const requiredFiles = [
  ".github/workflows/ci.yml",
  ".github/workflows/blueprint-gate.yml",
  ".github/workflows/infrastructure-contract.yml",
  "railway.json",
  "deploy/cloudflare/wrangler.toml",
  "deploy/cloudflare/src/index.ts",
  "deploy/supabase/config.toml",
  "deploy/firebase/firebase.json",
  "deploy/firebase/.firebaserc",
  "deploy/firebase/firestore.rules",
  "deploy/firebase/firestore.indexes.json",
  "deploy/firebase/functions/index.js",
  "deploy/firebase/public/index.html",
];
requiredFiles.forEach(requireFile);

// CI must be reproducible and fail closed on contract drift.
requireMarker(".github/workflows/ci.yml", "pnpm install --frozen-lockfile");
requireMarker(".github/workflows/blueprint-gate.yml", "check-master-contract.mjs");
requireMarker(".github/workflows/infrastructure-contract.yml", "check-infrastructure-contract.mjs");

// Railway: production-safe restart and health contract.
requireMarker("railway.json", "healthcheckPath");
requireMarker("railway.json", "restartPolicyType");
requireMarker("railway.json", "ON_FAILURE");
requireMarker("railway.json", "restartPolicyMaxRetries");

// Cloudflare: Workers + KV/R2/D1/Durable Objects descriptors.
requireMarker("deploy/cloudflare/wrangler.toml", "workers_dev");
requireMarker("deploy/cloudflare/wrangler.toml", "[[kv_namespaces]]");
requireMarker("deploy/cloudflare/wrangler.toml", "[[r2_buckets]]");
requireMarker("deploy/cloudflare/wrangler.toml", "[[d1_databases]]");
requireMarker("deploy/cloudflare/wrangler.toml", "[durable_objects]");
requireMarker("deploy/cloudflare/src/index.ts", "fetch");
requireMarker("deploy/cloudflare/src/index.ts", "EXECUTION_ROOMS");
requireMarker("deploy/cloudflare/src/index.ts", "EDGE_ROUTE_NOT_CONFIGURED");

// Supabase: API/Auth/Realtime configuration boundary.
requireMarker("deploy/supabase/config.toml", "[api]");
requireMarker("deploy/supabase/config.toml", "[auth]");
requireMarker("deploy/supabase/config.toml", "[realtime]");

// Firebase: backup Auth/cache/push/Functions boundary with Firestore rules.
requireMarker("deploy/firebase/firebase.json", "functions");
requireMarker("deploy/firebase/firebase.json", "firestore");
requireMarker("deploy/firebase/firestore.rules", "match /databases/{database}/documents");
requireMarker("deploy/firebase/firestore.rules", "allow read, write: if false");
requireMarker("deploy/firebase/functions/index.js", "exports");
requireMarker("deploy/firebase/public/index.html", "AngelMind");

// The repository contract intentionally uses placeholders for provider IDs/secrets;
// live credentials, DNS, paid plans, and provider accounts are never committed.
const cloudflare = read("deploy/cloudflare/wrangler.toml");
const railway = read("railway.json");
if (/(api[_-]?token|service[_-]?key|secret[_-]?key)\s*=\s*[\"'][^\"']+[\"']/i.test(cloudflare)) {
  failures.push("Cloudflare descriptor appears to contain a committed secret/token");
}
if (/(API_TOKEN|DATABASE_URL|PRIVATE_KEY)\s*[:=]\s*[\"'][^\"']+[\"']/i.test(railway)) {
  failures.push("Railway descriptor appears to contain a committed secret");
}

if (platforms.length < 5) failures.push(`V4 infrastructure platform count: expected 5, found ${platforms.length}`);
if (failures.length) {
  console.error("Infrastructure contract check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Infrastructure contract OK: ${platforms.length} platforms (${platforms.join(", ")}) with provider descriptors, security boundaries, and CI verification present.`);
