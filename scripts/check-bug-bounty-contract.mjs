import fs from "node:fs";

const required = [
  ["server/bug-bounty.ts", ["Program Management", "Researcher Onboarding", "Submission Portal", "Reward System", "Leaderboard", "Coordinated Disclosure", "Legal", "Hall of Fame"]],
  ["server/rest-v1-bug-bounty.ts", ["/api/v1/bugbounty/programs", "/api/v1/bugbounty/programs/:id/submission", "/api/v1/bugbounty/submissions/:id/validate", "/api/v1/bugbounty/submissions/:id/payout"]],
  ["server/bug-bounty.test.ts", ["bug bounty domain"]],
  ["docs/domain/09-bug-bounty.md", ["Program Management", "Researcher Onboarding", "Submission Portal", "Reward System", "Leaderboard", "Coordinated Disclosure", "Legal", "Hall of Fame"]],
];
const missing = [];
for (const [file, markers] of required) {
  if (!fs.existsSync(file)) { missing.push(`${file}: missing file`); continue; }
  const text = fs.readFileSync(file, "utf8");
  for (const marker of markers) if (!text.includes(marker)) missing.push(`${file}: missing ${marker}`);
}
const routeText = fs.readFileSync("server/rest-v1-bug-bounty.ts", "utf8");
const routes = [...routeText.matchAll(/app\.(get|post|patch|delete)\("([^"]+)"/g)].map(m => `${m[1].toUpperCase()} ${m[2]}`);
if (new Set(routes).size < 8) missing.push(`expected at least 8 bug bounty routes, found ${new Set(routes).size}`);
if (missing.length) { console.error(missing.join("\n")); process.exit(1); }
console.log(`Bug bounty contract PASS: ${new Set(routes).size} routes`);
