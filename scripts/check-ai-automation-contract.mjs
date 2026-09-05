import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const failures = [];
const requiredFiles = ["server/ai-automation.ts", "server/rest-v1-ai-automation.ts", "server/ai-platform.ts", "server/ai-routing.ts", "docs/domain/13-ai-automation.md"];
for (const file of requiredFiles) if (!existsSync(resolve(root, file))) failures.push(`missing ${file}`);
const service = read("server/ai-automation.ts");
for (const marker of ["modelKey", "WorkerRole", "PromptVersion", "budgetCents", "timeoutSeconds", "simulation", "governed", "approval", "audit"]) if (!service.toLowerCase().includes(marker.toLowerCase())) failures.push(`AI automation marker missing: ${marker}`);
const rest = read("server/rest-v1-ai-automation.ts");
for (const route of ["/api/v1/ai/automation/catalog", "/api/v1/ai/workers", "/api/v1/ai/workers/:id/run", "/api/v1/ai/prompts", "/api/v1/ai/route", "/api/v1/workspaces/:workspaceId/ai/quality"]) if (!rest.includes(route)) failures.push(`AI automation route missing: ${route}`);
if (!/mode:\s*input\.mode\s*\?\?\s*"simulation"/.test(service)) failures.push("simulation must remain the default execution mode");
if (!service.includes("approval-and-audit-required")) failures.push("external impact must require approval and audit");
const docs = read("docs/domain/13-ai-automation.md");
for (const marker of ["LLM Gateway", "Prompt Registry", "AI Budget", "Autonomous Workers", "approval", "audit"]) if (!docs.toLowerCase().includes(marker.toLowerCase())) failures.push(`docs marker missing: ${marker}`);
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("AI automation contract: PASS");
