import { authorizeToolExecution } from "./tool-execution-policy";
import {
  executeToolPipeline,
  persistToolPipelineObservation,
  type ToolExecutionPipelineResult,
} from "./tool-execution-pipeline";
import type { ToolRuntimeRequest } from "./tool-runtime";

export type GovernedToolExecutionRequest = ToolRuntimeRequest & {
  userId: number;
  workspaceId: number;
  target?: string;
  capabilities?: string[];
  sessionId?: number;
  assetId?: number;
  approvalId?: number;
};

export type GovernedToolExecutionResult =
  | {
      status: "blocked";
      reason: string;
      toolKey: string;
      pipeline: null;
    }
  | {
      status: "completed" | "failed" | "unavailable" | "timed_out" | "blocked";
      reason?: string;
      toolKey: string;
      pipeline: ToolExecutionPipelineResult;
      observationId?: number;
    };

/**
 * Single server-side entry point for governed tool execution.
 * Authorization happens immediately before the runtime call; callers cannot
 * supply scopeValidated/humanApproval as authority because those values are
 * derived from the authorization decision here.
 */
export async function executeGovernedTool(
  request: GovernedToolExecutionRequest
): Promise<GovernedToolExecutionResult> {
  const authorization = await authorizeToolExecution({
    userId: request.userId,
    workspaceId: request.workspaceId,
    toolKey: request.toolKey,
    mode: request.mode,
    target: request.target,
    input: request.input,
    approvalId: request.approvalId,
  });

  if (!authorization.allowed) {
    return {
      status: "blocked",
      reason: authorization.reason,
      toolKey: request.toolKey,
      pipeline: null,
    };
  }

  const pipeline = await executeToolPipeline({
    ...request,
    scopeValidated: true,
    humanApproval: authorization.humanApproval,
  });

  let observationId: number | undefined;
  if (request.sessionId && pipeline.runtime.status === "completed") {
    const observation = await persistToolPipelineObservation(
      request.userId,
      {
        sessionId: request.sessionId,
        assetId: request.assetId,
        request,
      },
      pipeline
    );
    observationId = observation.id;
  }

  return {
    status: pipeline.runtime.status,
    reason: pipeline.runtime.reason,
    toolKey: request.toolKey,
    pipeline,
    observationId,
  };
}