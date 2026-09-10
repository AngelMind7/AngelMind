import { describe, expect, it } from "vitest";
import { analyzeSmartContractSource } from "./smart-contract-audit";

describe("smart contract offline audit", () => {
  it("finds high-risk source patterns without network calls", () => {
    const result = analyzeSmartContractSource(`contract Vault {\n function withdraw() external {\n  require(tx.origin == owner);\n  payable(msg.sender).call(\"\");\n  selfdestruct(payable(msg.sender));\n }\n}`);
    expect(result.networkCalls).toBe(0);
    expect(result.status).toBe("completed");
    expect(result.findings.map(finding => finding.rule)).toEqual(["tx-origin-auth", "unchecked-call", "selfdestruct"]);
    expect(result.summary.critical).toBe(1);
    expect(result.summary.high).toBe(2);
  });

  it("returns deterministic empty results for safe source and rejects oversized input", () => {
    expect(analyzeSmartContractSource("contract Safe {}" ).findings).toEqual([]);
    expect(() => analyzeSmartContractSource("x".repeat(2_000_001))).toThrow("2 MB");
  });
});
