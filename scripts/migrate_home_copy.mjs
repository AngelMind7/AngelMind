import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const file = path.resolve(import.meta.dirname, "../client/src/pages/Home.tsx");
let source = await readFile(file, "utf8");
const pairs = [
  ["<Eyebrow>Authorized security research · internal command interface</Eyebrow>", "<Eyebrow>{copy(\"eyebrow\")}</Eyebrow>"],
  ["Command <span className=\"neon-pink\">Center</span>", "{copy(\"title\")}"],
  ["A governed control plane for scoped workspaces. Rehearsals remain fully offline; every future action is evaluated by deterministic safety policy before it can proceed.", "{copy(\"description\")}"],
  ["label=\"Active workspaces\"", "label={copy(\"activeWorkspaces\")}"], ["label=\"Pending approvals\"", "label={copy(\"pendingApprovals\")}"], ["label=\"Policy blocks\"", "label={copy(\"policyBlocks\")}"], ["label=\"Validated findings\"", "label={copy(\"validatedFindings\")}"], ["label=\"Recorded spend\"", "label={copy(\"recordedSpend\")}"],
  ["<Eyebrow>Network-zero rehearsal</Eyebrow>", "<Eyebrow>{copy(\"rehearsalEyebrow\")}</Eyebrow>"], [">Plan safely before anything else</h2>", ">{copy(\"rehearsalTitle\")}</h2>"], [">Dry-run only</Badge>", ">{copy(\"dryRunOnly\")}</Badge>"],
  ["title=\"Scope + conduct gate\" detail=\"The declared allowlist and exclusions are evaluated deterministically.\"", "title={copy(\"scopeGate\")} detail={copy(\"scopeGateDetail\")}"], ["title=\"No target interaction\" detail=\"Network calls and tool executions remain fixed at zero for every rehearsal.\"", "title={copy(\"noTargetInteraction\")} detail={copy(\"noTargetInteractionDetail\")}"], ["title=\"Budget + session checks\" detail=\"Estimates are blocked if the workspace budget or session ceiling is exhausted.\"", "title={copy(\"budgetSession\")} detail={copy(\"budgetSessionDetail\")}"], ["title=\"Hypothetical task map\" detail=\"Only policy, asset-graph, and coverage planning tasks are generated.\"", "title={copy(\"hypotheticalMap\")} detail={copy(\"hypotheticalMapDetail\")}"],
  ["\"Select guarded workspace\" : \"Create a workspace to begin\"", "copy(\"selectGuardedWorkspace\") : copy(\"createWorkspaceToBegin\")"], ["\"Rehearsing…\" : \"Start rehearsal\"", "copy(\"rehearsing\") : copy(\"startRehearsal\")"],
  ["<Eyebrow>Operational telemetry</Eyebrow>", "<Eyebrow>{copy(\"telemetryEyebrow\")}</Eyebrow>"], [">Coverage lens</h2>", ">{copy(\"coverageLens\")}</h2>"], ["Coverage indicators remain empty until a governed run records eligible, reviewable evidence.", "{copy(\"coverageDescription\")}"], ["label=\"Scope governance\"", "label={copy(\"scopeGovernance\")}"], ["label=\"Program context\"", "label={copy(\"programContext\")}"], ["label=\"Hypothesis planning\"", "label={copy(\"hypothesisPlanning\")}"], ["label=\"Finding validation\"", "label={copy(\"findingValidation\")}"], ["No model execution · no external target contact", "{copy(\"noModelNoContact\")}"],
  ["<Eyebrow>Run ledger</Eyebrow>", "<Eyebrow>{copy(\"runLedger\")}</Eyebrow>"], [">Latest governed activity</h2>", ">{copy(\"latestActivity\")}</h2>"], [">No governed activity has been recorded yet.</td>", ">{copy(\"noActivity\")}</td>"],
];
for (const [from, to] of pairs) source = source.replace(from, to);
source = source.replace("const { locale, formatDate } = useLocale();", "const { locale, formatDate, copy } = useLocale();");
await writeFile(file, source);
console.log(`Applied ${pairs.length} explicit command-center copy bindings.`);
