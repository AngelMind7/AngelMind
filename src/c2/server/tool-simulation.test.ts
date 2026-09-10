import { describe, expect, it } from "vitest";
import { isSimulationToolKey, simulateRegisteredTool } from "./tool-simulation";

describe("tool simulation", () => {
  it("recognizes governed generated families", () => {
    expect(isSimulationToolKey("recon_subdomain_enumeration")).toBe(true);
    expect(isSimulationToolKey("c2_payload_simulation")).toBe(true);
    expect(isSimulationToolKey("phish_click_tracker_simulation")).toBe(true);
    expect(isSimulationToolKey("unknown_tool")).toBe(false);
  });

  it("returns deterministic synthetic evidence records without executing a target", () => {
    const result = simulateRegisteredTool({
      toolKey: "scan_web_vulnerability_simulation",
      input: "fixture://angelmind/demo-target",
      scenario: "finding",
    });

    expect(result.status).toBe("completed");
    expect(result.mode).toBe("simulation");
    expect(result.synthetic).toBe(true);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("synthetic_scan_observation");
    expect(result.inputSha256).toHaveLength(64);
  });
});
