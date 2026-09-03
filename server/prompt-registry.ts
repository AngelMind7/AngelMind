import manifest from "../config/ai-prompt-registry.json";

export type PromptRole = "scope" | "evidence" | "risk" | "report";
export type RegisteredPrompt = (typeof manifest.prompts)[number];

const prompts = new Map(manifest.prompts.map(prompt => [`${prompt.id}@${prompt.version}`, prompt]));

function assertRole(role: string): asserts role is PromptRole {
  if (!["scope", "evidence", "risk", "report"].includes(role)) {
    throw new Error(`Unknown prompt role: ${role}`);
  }
}

export function listRegisteredPrompts(): readonly RegisteredPrompt[] {
  return manifest.prompts;
}

export function getPrompt(id: string, version: number): RegisteredPrompt | undefined {
  return prompts.get(`${id}@${version}`);
}

export function assertActivePrompt(id: string, version: number, role: string): RegisteredPrompt {
  assertRole(role);
  const prompt = getPrompt(id, version);
  if (!prompt || prompt.status !== "active" || prompt.role !== role) {
    throw new Error(`Prompt ${id}@${version} is not active for role ${role}.`);
  }
  return prompt;
}

export function renderPrompt(prompt: RegisteredPrompt, variables: Record<string, string>): string {
  if (!prompt || prompt.status !== "active") throw new Error("Prompt is not active.");
  return prompt.template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key: string) => variables[key] ?? `{{${key}}}`);
}
