import { describe, expect, it } from "vitest";
import {
  canExecuteTool,
  getToolCatalogSummary,
  listToolCatalog,
  toolCatalog,
} from "./tool-catalog";

const verifiedRuntimeKeys = new Set([
  "asset_intelligence.30",
  "asset_intelligence.31",
  "binary_artifact_analysis.2",
  "binary_artifact_analysis.3",
  "binary_artifact_analysis.8",
  "binary_artifact_analysis.23",
  "binary_artifact_analysis.24",
  "binary_artifact_analysis.30",
  "configuration.1",
  "configuration.17",
  "dependencies.3",
  "dependencies.6",
  "dependencies.11",
  "dependencies.12",
  "dependencies.20",
  "dependencies.9",
  "email_dns_security.1",
  "email_dns_security.2",
  "log_analysis.13",
  "traffic_analysis.12",
  "traffic_analysis.17",
  "traffic_analysis.8",
  "traffic_analysis.10",
  "secrets_detection.8",
  "secrets_detection.1",
  "secrets_detection.6",
  "source_code.1",
  "source_code.9",
  "source_code.18",
  "source_code.19",
  "source_code.22",
  "source_code.23",
  "supply_chain.3",
  "validation.6",
  "validation.8",
  "validation.12",
  "validation.13",
  "validation.17",
  "validation.19",
]);

const addendumToolsByCategory = {
  "Social Engineering": [
    "Gophish",
    "King Phisher",
    "Social-Engineer Toolkit (SET)",
    "Evilginx2",
    "Modlishka",
    "Muraena",
    "LUCY",
  ],
  "Adversary Simulation": [
    "Atomic Red Team",
    "MITRE Caldera",
    "Infection Monkey",
    "Metta",
    "Vectr",
    "APTSimulator",
    "Prelude Operator",
  ],
  "AI/LLM Security": [
    "Garak",
    "PyRIT",
    "promptmap",
    "Rebuff",
    "Vigil-LLM",
    "LLM Guard",
    "Adversarial Robustness Toolbox (ART)",
    "Counterfit",
    "Giskard",
  ],
  "Email/DNS Security": [
    "CheckDMARC",
    "Spoofcheck",
    "DKIMpy",
    "MXToolbox",
    "EmailRep",
  ],
  "Post-Exploitation": [
    "PEASS-ng (WinPEAS/LinPEAS)",
    "Seatbelt",
    "SharpUp",
    "Evil-WinRM",
    "PowerSploit",
    "Linikatz",
  ],
  "Blockchain Security": [
    "Slither",
    "Mythril",
    "Echidna",
    "Manticore",
    "Foundry (forge/cast)",
    "Securify",
  ],
  "Physical/Hardware Security": [
    "Proxmark3",
    "ChipWhisperer",
    "HackRF Tools",
    "JTAGulator",
    "Firmware Analysis Toolkit (FAT)",
  ],
} as const;

describe("tool catalog safety boundary", () => {
  it("loads the complete manifest with only verified runtime adapters enabled", () => {
    expect(toolCatalog).toHaveLength(556);
    expect(
      toolCatalog
        .filter(tool => tool.enabledByDefault)
        .map(tool => tool.toolKey)
        .sort()
    ).toEqual([...verifiedRuntimeKeys].sort());
    expect(
      toolCatalog
        .filter(tool => !verifiedRuntimeKeys.has(tool.toolKey))
        .every(
          tool =>
            tool.enabledByDefault === false &&
            tool.verificationStatus === "provisional_from_user_pdf"
        )
    ).toBe(true);
  });

  it("matches manifest risk totals", () => {
    const summary = getToolCatalogSummary();
    expect(summary.total).toBe(556);
    expect(summary.byRisk).toEqual({
      low: 246,
      medium: 187,
      high: 74,
      critical: 49,
    });
  });

  it("exposes actual category totals, including all addendum categories", () => {
    const summary = getToolCatalogSummary();
    expect(summary.byCategory).toMatchObject({
      "Social Engineering": 7,
      "Adversary Simulation": 7,
      "AI/LLM Security": 9,
      "Email/DNS Security": 5,
      "Post-Exploitation": 6,
      "Blockchain Security": 6,
      "Physical/Hardware Security": 5,
    });
  });

  it("keeps every addendum entry aligned with its declared category", () => {
    for (const [category, names] of Object.entries(addendumToolsByCategory)) {
      for (const name of names) {
        const tool = toolCatalog.find(candidate => candidate.name === name);
        expect(tool, `${name} should be present`).toBeDefined();
        expect(tool?.category).toBe(category);
        if (tool && verifiedRuntimeKeys.has(tool.toolKey)) {
          expect(tool.enabledByDefault).toBe(true);
          expect(tool.verificationStatus).toBe("verified");
        } else {
          expect(tool?.enabledByDefault).toBe(false);
          expect(tool?.verificationStatus).toBe("provisional_from_user_pdf");
        }
      }
    }
  });

  it("filters safe candidate classes without enabling them", () => {
    expect(
      listToolCatalog({ disposition: "candidate_offline_or_artifact" })
    ).toHaveLength(163);
    expect(
      listToolCatalog({ disposition: "candidate_passive_review" })
    ).toHaveLength(72);
    expect(listToolCatalog({ disposition: "disabled_high_risk" })).toHaveLength(
      123
    );
  });

  it("allows only verified safe runtime adapters", () => {
    for (const toolKey of verifiedRuntimeKeys) {
      expect(
        canExecuteTool({
          toolKey,
          mode:
            toolKey.startsWith("traffic_analysis.") ||
            toolKey.startsWith("email_dns_security.") ||
            toolKey.startsWith("asset_intelligence.")
              ? "passive_readonly"
              : "offline_artifact",
          scopeValidated: true,
          humanApproval: false,
        })
      ).toMatchObject({ allowed: true });
    }
  });

  it("rejects every provisional tool before execution", () => {
    const result = canExecuteTool({
      toolKey: "ai_llm_security.1",
      mode: "offline_artifact",
      scopeValidated: true,
      humanApproval: false,
    });
    expect(result).toEqual({ allowed: false, reason: "tool_not_verified" });
  });

  it("rejects unknown and privileged tool keys", () => {
    expect(
      canExecuteTool({
        toolKey: "missing.1",
        mode: "passive_readonly",
        scopeValidated: true,
        humanApproval: true,
      })
    ).toEqual({ allowed: false, reason: "tool_not_found" });
    expect(
      canExecuteTool({
        toolKey: "post-exploitation.1",
        mode: "privileged_or_destructive",
        scopeValidated: true,
        humanApproval: true,
      })
    ).toEqual({ allowed: false, reason: "tool_not_verified" });
  });
});
