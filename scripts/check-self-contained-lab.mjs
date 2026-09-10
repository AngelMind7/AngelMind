import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "lab", "self-contained", "manifest.json");

function fail(message) {
  console.error(`SELF_CONTAINED_LAB_FAIL: ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(manifestPath)) {
  fail(`missing ${path.relative(root, manifestPath)}`);
  process.exit();
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch (error) {
  fail(`invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  process.exit();
}

const requiredProfiles = ["core", "full"];
const requiredP0 = Array.from({ length: 14 }, (_, i) => `P0-${String(i + 1).padStart(2, "0")}`);
const requiredP1 = Array.from({ length: 18 }, (_, i) => `P1-${String(i + 1).padStart(2, "0")}`);
const requiredReplacements = [
  "externalTarget",
  "licensedTool",
  "cloudAccount",
  "physicalDevice",
  "humanCiApproval",
  "productionEvidence",
];
const requiredInvariants = [
  "targetTraffic=false",
  "no_plaintext_secrets",
  "no_untracked_execution",
  "high_critical_requires_approval",
  "evidence_requires_hash_and_provenance",
  "release_requires_p0_and_p1",
];

if (manifest.externalDependenciesAllowed !== false) {
  fail("externalDependenciesAllowed must be false");
}

for (const profile of requiredProfiles) {
  const definition = manifest.profiles?.[profile];
  if (!definition) {
    fail(`missing profile ${profile}`);
    continue;
  }
  for (const key of ["services", "targets", "acceptance"]) {
    if (!Array.isArray(definition[key]) || definition[key].length === 0) {
      fail(`${profile}.${key} must be a non-empty array`);
    }
  }
}

for (const acceptance of [...requiredP0, ...requiredP1]) {
  if (!manifest.profiles?.full?.acceptance?.includes(acceptance)) {
    fail(`full profile missing acceptance ${acceptance}`);
  }
}

for (const replacement of requiredReplacements) {
  if (!manifest.replacementPolicy?.[replacement]) {
    fail(`missing replacement policy ${replacement}`);
  }
}

for (const invariant of requiredInvariants) {
  if (!manifest.invariants?.includes(invariant)) {
    fail(`missing invariant ${invariant}`);
  }
}

if (process.exitCode) process.exit();

console.log("SELF_CONTAINED_LAB_OK");
console.log(`lab=${manifest.labId}`);
console.log(`profiles=${requiredProfiles.join(",")}`);
console.log(`acceptance=p0:${requiredP0.length},p1:${requiredP1.length}`);
console.log("externalDependenciesAllowed=false");
