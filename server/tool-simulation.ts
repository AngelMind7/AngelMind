import { createHash, randomUUID } from "node:crypto";

export type ToolSimulationRequest = {
  toolKey: string;
  input?: string;
  scenario?: "clean" | "finding" | "mixed";
};

export type ToolSimulationResult = {
  requestId: string;
  toolKey: string;
  status: "completed";
  mode: "simulation";
  stdout: string;
  stderr: string;
  durationMs: number;
  synthetic: true;
  inputSha256: string;
};

const families: Record<string, { finding: string; category: string }> = {
  recon_: { finding: "synthetic_asset_observation", category: "asset_intelligence" },
  scan_: { finding: "synthetic_scan_observation", category: "threat_surface" },
  research_: { finding: "synthetic_research_observation", category: "vulnerability_research" },
  fuzz_: { finding: "synthetic_fuzz_observation", category: "validation" },
  c2_: { finding: "synthetic_c2_exercise_event", category: "red_team_simulation" },
  phish_: { finding: "synthetic_phishing_exercise_event", category: "red_team_simulation" },
  intel_: { finding: "synthetic_intel_observation", category: "threat_intel" },
  osint_: { finding: "synthetic_osint_observation", category: "asset_intelligence" },
  post_: { finding: "synthetic_post_exercise_observation", category: "purple_team" },
  custom_: { finding: "synthetic_custom_module_observation", category: "custom_module" },
};

function familyFor(toolKey: string) {
  return Object.entries(families).find(([prefix]) => toolKey.startsWith(prefix))?.[1] ?? {
    finding: "synthetic_tool_observation",
    category: "tooling",
  };
}

export function simulateRegisteredTool(request: ToolSimulationRequest): ToolSimulationResult {
  const input = request.input ?? "simulation-fixture";
  const inputSha256 = createHash("sha256").update(input).digest("hex");
  const family = familyFor(request.toolKey);
  const scenario = request.scenario ?? "mixed";
  const records = scenario === "clean"
    ? [{ key: "simulation.status", value: "clean", confidence: 1, synthetic: true }]
    : scenario === "finding"
      ? [{ key: family.finding, value: "detected", confidence: 0.92, category: family.category, synthetic: true }]
      : [
          { key: "simulation.status", value: "completed", confidence: 1, synthetic: true },
          { key: family.finding, value: "detected", confidence: 0.92, category: family.category, synthetic: true },
        ];

  return {
    requestId: randomUUID(),
    toolKey: request.toolKey,
    status: "completed",
    mode: "simulation",
    stdout: records.map(record => JSON.stringify(record)).join("\n"),
    stderr: "",
    durationMs: 1,
    synthetic: true,
    inputSha256,
  };
}

export function isSimulationToolKey(toolKey: string) {
  return Object.keys(families).some(prefix => toolKey.startsWith(prefix));
}
