import { createHash } from "node:crypto";
import { normalizeEvidence, type CanonicalEvidence } from "./evidence-normalizer";
import { runRegisteredTool, type ToolRuntimeRequest, type ToolRuntimeResult } from "./tool-runtime";
import { createResearchObservation } from "./research-workflow";

export const adapterLifecycle = ["validate", "prepare", "execute", "collect", "parse", "normalize", "cleanup"] as const;
export type AdapterLifecyclePhase = (typeof adapterLifecycle)[number];

export type ToolExecutionPipelineResult = {
  runtime: ToolRuntimeResult;
  phases: AdapterLifecyclePhase[];
  rawOutputSha256: string | null;
  parsedRecords: Record<string, unknown>[];
  evidence: CanonicalEvidence | null;
  provenance: {
    toolKey: string;
    requestId: string;
    acquisition: ToolRuntimeRequest["mode"];
    rawOutputSha256: string | null;
    normalizedEvidenceSha256: string | null;
  };
};

function parseOutput(stdout: string): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  for (const line of stdout.split(/\r?\n/).map(value => value.trim()).filter(Boolean)) {
    try {
      const value: unknown = JSON.parse(line);
      if (value && typeof value === "object" && !Array.isArray(value)) records.push(value as Record<string, unknown>);
    } catch {
      // Non-JSON output stays represented by the raw hash; it is never guessed into evidence.
    }
  }
  return records.slice(0, 500);
}

export async function executeToolPipeline(request: ToolRuntimeRequest & { capabilities?: string[] }): Promise<ToolExecutionPipelineResult> {
  const phases: AdapterLifecyclePhase[] = ["validate", "prepare", "execute", "collect"];
  const runtime = await runRegisteredTool(request);
  const raw = `${runtime.stdout}\n${runtime.stderr}`;
  const rawOutputSha256 = runtime.status === "completed" || runtime.stdout || runtime.stderr
    ? createHash("sha256").update(raw).digest("hex")
    : null;
  const parsedRecords = runtime.status === "completed" ? parseOutput(runtime.stdout) : [];
  phases.push("parse");
  const evidence = runtime.status === "completed"
    ? normalizeEvidence({
        data: { toolKey: request.toolKey, exitCode: runtime.exitCode, records: parsedRecords, rawOutputSha256 },
        capabilities: request.capabilities ?? [],
        confidence: parsedRecords.length > 0 ? 1 : 0.5,
        chainReferences: [runtime.requestId],
      })
    : null;
  phases.push("normalize", "cleanup");
  return {
    runtime,
    phases,
    rawOutputSha256,
    parsedRecords,
    evidence,
    provenance: {
      toolKey: request.toolKey,
      requestId: runtime.requestId,
      acquisition: request.mode,
      rawOutputSha256,
      normalizedEvidenceSha256: evidence?.sha256 ?? null,
    },
  };
}

export function isLifecycleComplete(phases: readonly AdapterLifecyclePhase[]) {
  return adapterLifecycle.every((phase, index) => phases[index] === phase);
}

export async function persistToolPipelineObservation(userId: number, input: { sessionId: number; assetId?: number; request: ToolRuntimeRequest & { capabilities?: string[] } }, result: ToolExecutionPipelineResult) {
  if (result.runtime.status !== "completed") throw new Error("Only completed tool executions can be persisted as observations.");
  if (!isLifecycleComplete(result.phases)) throw new Error("Tool execution lifecycle is incomplete.");
  const content = JSON.stringify({ toolKey: result.provenance.toolKey, requestId: result.provenance.requestId, records: result.parsedRecords, evidence: result.evidence });
  return createResearchObservation(userId, { sessionId: input.sessionId, assetId: input.assetId, title: `Tool observation: ${result.provenance.toolKey}`, content, sourceType: "tool_execution", sourceReference: result.provenance.requestId, rawOutputSha256: result.provenance.rawOutputSha256 ?? undefined, normalizedEvidenceSha256: result.provenance.normalizedEvidenceSha256 ?? undefined });
}
