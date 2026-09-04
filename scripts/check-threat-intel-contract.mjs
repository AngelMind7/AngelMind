import fs from "node:fs";

const required = [
  ["server/threat-intelligence.ts", ["cve", "ioc", "threat_actor", "brand_mention", "provenance", "confidence", "rateLimitPerMinute", "legalBasis", "targetCollectionEnabled: false"]],
  ["server/rest-v1-threat-intelligence.ts", ["/api/v1/workspaces/:workspaceId/threat-intel", "/api/v1/threat-intel/sources", "/api/v1/threat-intel/indicators", "/api/v1/threat-intel/actors", "collection-plan"]],
  ["server/threat-intelligence.test.ts", ["deduplicates", "provenance", "disabled"]],
  ["docs/domain/12-threat-intel.md", ["CVE/IOC feeds", "threat-actor mapping", "brand mentions", "source tracking"]],
];
for (const [file, markers] of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  const text = fs.readFileSync(file, "utf8");
  for (const marker of markers) if (!text.toLowerCase().includes(marker.toLowerCase())) throw new Error(`Missing marker ${marker} in ${file}`);
}
console.log("Threat Intelligence contract: PASS");
