import { getCapabilityDefinition, selectAdapter } from "./capability-registry";
import { runCanonicalTool, resolveCanonicalTool } from "./canonical-tool-runtime";
import { assertAuthorizedTool, getToolByAdapter, getRuntimeToolKey, listRegisteredTools } from "./tool-registry";
import type { ToolRuntimeRequest, ToolRuntimeResult } from "./tool-runtime";

export type CapabilityResolution = {
  capability: string;
  adapter: string;
  toolId: string;
  runtimeToolKey: string;
  fallbackUsed: boolean;
};

/**
 * Resolves a capability to the registered tool/runtime identity without executing it.
 * This keeps capability selection deterministic and prevents ad-hoc adapter names.
 */
export function resolveCapability(capability: string): CapabilityResolution | undefined {
  const definition = getCapabilityDefinition(capability);
  if (!definition) return undefined;

  const registeredAdapters = listRegisteredTools().map((tool) => tool.adapter);
  const adapter = selectAdapter(capability, registeredAdapters);
  if (!adapter) return undefined;

  const tool = getToolByAdapter(adapter);
  if (!tool) return undefined;
  const runtimeToolKey = getRuntimeToolKey(tool.id);
  const canonical = resolveCanonicalTool(tool.id);
  if (!runtimeToolKey || !canonical?.runtimeToolKey) return undefined;

  return {
    capability,
    adapter,
    toolId: tool.id,
    runtimeToolKey,
    fallbackUsed: adapter !== definition.primaryAdapter,
  };
}

/**
 * Executes a capability only through the canonical registered tool path.
 * The authorization gate remains mandatory; capability selection never grants it.
 */
export async function runCapability(
  capability: string,
  request: Omit<ToolRuntimeRequest, "toolKey">
): Promise<ToolRuntimeResult> {
  const resolution = resolveCapability(capability);
  if (!resolution) {
    return {
      requestId: "capability-rejected",
      toolKey: capability,
      status: "blocked",
      exitCode: null,
      stdout: "",
      stderr: "",
      durationMs: 0,
      reason: "capability_not_ready",
    };
  }

  try {
    assertAuthorizedTool(resolution.toolId);
  } catch (error) {
    return {
      requestId: "capability-rejected",
      toolKey: resolution.toolId,
      status: "blocked",
      exitCode: null,
      stdout: "",
      stderr: "",
      durationMs: 0,
      reason: error instanceof Error ? error.message : "tool_not_authorized",
    };
  }

  return runCanonicalTool(resolution.toolId, request);
}
