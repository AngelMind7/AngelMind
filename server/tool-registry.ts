import manifest from "../config/tool-capability-registry.json";

export type RegisteredTool = (typeof manifest.tools)[number];

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

export function assertAuthorizedTool(toolId: string): RegisteredTool {
  const tool = getRegisteredTool(toolId);
  if (!tool) throw new Error(`Unknown tool: ${toolId}`);
  if (tool.execution !== "authorized-only") throw new Error(`Tool ${toolId} is not authorized for execution.`);
  return tool;
}
