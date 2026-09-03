import {
  getRegisteredTool,
  getRuntimeToolKey,
} from "./tool-registry";
import {
  runRegisteredTool,
  type ToolRuntimeRequest,
  type ToolRuntimeResult,
} from "./tool-runtime";

/**
 * Control-plane execution entrypoint. Callers use the stable manifest ID;
 * legacy runtime/catalog aliases stay encapsulated in tool-registry.
 */
export async function runCanonicalTool(
  toolId: string,
  request: Omit<ToolRuntimeRequest, "toolKey">
): Promise<ToolRuntimeResult> {
  const tool = getRegisteredTool(toolId);
  const runtimeToolKey = getRuntimeToolKey(toolId);
  if (!tool || !runtimeToolKey) {
    return {
      requestId: "canonical-tool-rejected",
      toolKey: toolId,
      status: "blocked",
      exitCode: null,
      stdout: "",
      stderr: "",
      durationMs: 0,
      reason: "canonical_tool_not_registered",
    };
  }

  return runRegisteredTool({ ...request, toolKey: runtimeToolKey });
}

export function resolveCanonicalTool(toolId: string) {
  const tool = getRegisteredTool(toolId);
  return tool
    ? { toolId, runtimeToolKey: getRuntimeToolKey(toolId) }
    : undefined;
}
