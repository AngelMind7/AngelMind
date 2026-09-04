import manifest from "../config/tool-capability-registry.json";
import { getToolCatalogEntry } from "./tool-catalog";

export type RegisteredTool = (typeof manifest.tools)[number];

/**
 * Canonical manifest IDs are the stable control-plane identity. Runtime tool
 * keys may retain legacy names; aliases are explicit rather than inferred.
 */
const RUNTIME_TOOL_ALIASES: Readonly<Record<string, string>> = {
  burp_pro: "burp_suite_pro",
  gitleaks: "secrets_detection.1",
  subfinder: "asset_intelligence.28",
  trivy: "dependencies.12",
};

const TOOLS = new Map(manifest.tools.map((tool) => [tool.id, tool]));
const ADAPTERS = new Map(manifest.tools.map((tool) => [tool.adapter, tool]));

export function listRegisteredTools(): readonly RegisteredTool[] {
  return manifest.tools;
}

export function getRegisteredTool(toolId: string): RegisteredTool | undefined {
  return TOOLS.get(toolId);
}

export function getToolByAdapter(adapter: string): RegisteredTool | undefined {
  return ADAPTERS.get(adapter);
}

export function isRegisteredAdapter(adapter: string): boolean {
  return ADAPTERS.has(adapter);
}

export function toolsForCapability(capability: string): readonly RegisteredTool[] {
  return manifest.tools.filter((tool) => tool.capabilities.includes(capability));
}

export function getRuntimeToolKey(toolId: string): string | undefined {
  const tool = getRegisteredTool(toolId);
  if (!tool) return undefined;
  return RUNTIME_TOOL_ALIASES[tool.id] ?? tool.id;
}

export function assertRuntimeTool(toolId: string): RegisteredTool {
  const tool = getRegisteredTool(toolId);
  if (!tool) throw new Error(`Unknown tool: ${toolId}`);

  const runtimeKey = getRuntimeToolKey(toolId);
  if (!runtimeKey || !getToolCatalogEntry(runtimeKey)) {
    throw new Error(`Tool ${toolId} has no registered runtime identity: ${runtimeKey ?? "none"}`);
  }
  return tool;
}

export function assertAuthorizedTool(toolId: string): RegisteredTool {
  const tool = assertRuntimeTool(toolId);
  if (tool.executionMode !== "authorized-only") throw new Error(`Tool ${toolId} is not authorized for execution.`);
  return tool;
}
