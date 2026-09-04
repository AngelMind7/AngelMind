import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(root, "client/src/authenticatedRoutes.ts"), "utf8");
const paths = [...source.matchAll(/path:\s*"([^"]+)"/g)].map(match => match[1]);
const indexOf = path => paths.indexOf(path);
const failures = [];

const canonical = [
  "/ai/workers", "/ai/workers/new", "/ai/workers/:id",
  "/utf/runners", "/utf/runners/new", "/utf/runners/:id/execute", "/utf/runners/:id",
  "/playbooks", "/playbooks/new", "/playbooks/:id/edit", "/playbooks/:id/run", "/playbooks/:id",
  "/evidence", "/evidence/:id",
  "/redteam/implants/:id/beacon", "/redteam/implants/:id/status",
];

for (const route of canonical) if (indexOf(route) < 0) failures.push(`missing:${route}`);

const pairs = [
  ["/utf/runners/:id/execute", "/utf/runners/:id"],
  ["/playbooks/:id/edit", "/playbooks/:id"],
  ["/playbooks/:id/run", "/playbooks/:id"],
  ["/redteam/implants/:id/beacon", "/redteam/implants/:id/status"],
];
for (const [specific, dynamic] of pairs) {
  if (indexOf(specific) >= 0 && indexOf(dynamic) >= 0 && indexOf(specific) > indexOf(dynamic)) {
    failures.push(`shadowed:${specific} must precede ${dynamic}`);
  }
}

const legacy = ["/agents", "/agents/new", "/agents/:id"];
for (const route of legacy) if (indexOf(route) < 0) failures.push(`missing-compatibility:${route}`);

if (failures.length) {
  console.error("V4 route contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`V4 route contract OK: ${paths.length} registered routes; canonical namespaces and shadowing order verified.`);
