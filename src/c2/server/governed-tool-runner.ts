import { decideRuntimeResources, runtimeConcurrencyLimit } from "./runtime-resource-policy";
import { runRegisteredTool, type ToolRuntimeRequest, type ToolRuntimeResult } from "./tool-runtime";

let activeRuntimes = 0;
const waiters: Array<() => void> = [];

async function acquireRuntimeSlot() {
  const limit = runtimeConcurrencyLimit();
  if (activeRuntimes < limit) {
    activeRuntimes += 1;
    return;
  }
  await new Promise<void>(resolve => waiters.push(resolve));
  activeRuntimes += 1;
}

function releaseRuntimeSlot() {
  activeRuntimes = Math.max(0, activeRuntimes - 1);
  const next = waiters.shift();
  if (next) next();
}

export async function runGovernedTool(request: ToolRuntimeRequest): Promise<ToolRuntimeResult> {
  const inputBytes = Buffer.byteLength(request.input, "utf8");
  const decision = decideRuntimeResources({
    mode: request.mode,
    timeoutMs: request.timeoutMs,
    maxOutputBytes: request.maxOutputBytes,
    inputBytes,
  });
  if (!decision.allowed) {
    return {
      requestId: "resource-policy-blocked",
      toolKey: request.toolKey,
      status: "blocked",
      exitCode: null,
      stdout: "",
      stderr: "",
      durationMs: 0,
      reason: decision.reason,
    };
  }

  await acquireRuntimeSlot();
  try {
    return await runRegisteredTool({
      ...request,
      timeoutMs: decision.timeoutMs,
      maxOutputBytes: decision.maxOutputBytes,
    });
  } finally {
    releaseRuntimeSlot();
  }
}

export function governedRuntimeConcurrencyForTests() {
  return { active: activeRuntimes, queued: waiters.length, limit: runtimeConcurrencyLimit() };
}
