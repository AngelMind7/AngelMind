import { describe, expect, it } from "vitest";
import {
  assertAuthorizedTool,
  getRegisteredTool,
  getToolByAdapter,
  isRegisteredAdapter,
  listRegisteredTools,
  toolsForCapability,
} from "./tool-registry";

describe("tool registry", () => {
  it("indexes every canonical tool by id and adapter", () => {
    expect(listRegisteredTools()).toHaveLength(15);
    const gitleaks = getRegisteredTool("gitleaks");
    expect(gitleaks?.adapter).toBe("gitleaks_adapter");
    expect(getToolByAdapter("trivy_adapter")?.id).toBe("trivy");
    expect(isRegisteredAdapter("subfinder_adapter")).toBe(true);
    expect(isRegisteredAdapter("unknown_adapter")).toBe(false);
  });

  it("resolves capability membership", () => {
    expect(toolsForCapability("secret-detection").map((tool) => tool.id)).toEqual(["gitleaks"]);
    expect(toolsForCapability("sql-injection-testing").map((tool) => tool.id)).toEqual(["burp_pro", "sqlmap"]);
  });

  it("fails closed for unknown tools", () => {
    expect(() => assertAuthorizedTool("not-real")).toThrow("Unknown tool");
    expect(assertAuthorizedTool("gitleaks").execution).toBe("authorized-only");
  });
});
