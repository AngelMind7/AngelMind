export type RuntimeResourceRequest = {
  mode: "offline_artifact" | "passive_readonly" | "active_nondestructive" | "privileged_or_destructive";
  timeoutMs?: number;
  maxOutputBytes?: number;
  inputBytes: number;
};

export type RuntimeResourceDecision =
  | { allowed: true; timeoutMs: number; maxOutputBytes: number }
  | { allowed: false; reason: string };

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_OUTPUT_BYTES = 512_000;
const MAX_OUTPUT_BYTES = 2_000_000;
const MAX_INPUT_BYTES = 2_000_000;

export function decideRuntimeResources(request: RuntimeResourceRequest): RuntimeResourceDecision {
  if (request.inputBytes < 0 || request.inputBytes > MAX_INPUT_BYTES) return { allowed: false, reason: "input_limit_exceeded" };
  const timeoutMs = Math.min(Math.max(request.timeoutMs ?? DEFAULT_TIMEOUT_MS, 1_000), MAX_TIMEOUT_MS);
  const maxOutputBytes = Math.min(Math.max(request.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES, 1_024), MAX_OUTPUT_BYTES);
  if (request.mode === "privileged_or_destructive") return { allowed: false, reason: "privileged_runtime_disabled" };
  return { allowed: true, timeoutMs, maxOutputBytes };
}

export function runtimeConcurrencyLimit() {
  const configured = Number.parseInt(process.env.ANGELMIND_RUNTIME_CONCURRENCY ?? "4", 10);
  return Number.isFinite(configured) ? Math.min(Math.max(configured, 1), 16) : 4;
}
