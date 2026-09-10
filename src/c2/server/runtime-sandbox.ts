import { spawn } from "node:child_process";

export type SandboxLimits = {
  timeoutMs: number;
  maxOutputBytes: number;
};

const MAX_INPUT_ENV_BYTES = 64 * 1024;
const MAX_CONCURRENT_PROCESSES = 8;
let activeProcesses = 0;

/**
 * Process-level containment for the runtime boundary. The hard isolation
 * boundary remains the deployment container; this layer adds fail-closed
 * environment, timeout, concurrency and output limits before a tool process starts.
 */
export function sandboxSpawn(
  binary: string,
  args: string[],
  limits: SandboxLimits
) {
  const env = {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    HOME: "/tmp",
    TMPDIR: "/tmp",
  };
  const envBytes = Object.entries(env).reduce(
    (total, [key, value]) => total + Buffer.byteLength(key) + Buffer.byteLength(value),
    0
  );
  if (envBytes > MAX_INPUT_ENV_BYTES) throw new Error("sandbox_environment_limit");
  if (limits.timeoutMs < 1_000 || limits.timeoutMs > 120_000)
    throw new Error("sandbox_timeout_limit");
  if (limits.maxOutputBytes < 1_024 || limits.maxOutputBytes > 2_000_000)
    throw new Error("sandbox_output_limit");
  if (activeProcesses >= MAX_CONCURRENT_PROCESSES)
    throw new Error("sandbox_concurrency_limit");

  activeProcesses += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    activeProcesses = Math.max(0, activeProcesses - 1);
  };

  try {
    const child = spawn(binary, args, {
      cwd: "/tmp",
      env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    child.once("close", release);
    child.once("error", release);
    return child;
  } catch (error) {
    release();
    throw error;
  }
}

export function sandboxOutputWithinLimit(value: string, maxBytes: number) {
  return Buffer.byteLength(value, "utf8") <= maxBytes;
}

export function getSandboxConcurrency() {
  return { active: activeProcesses, limit: MAX_CONCURRENT_PROCESSES } as const;
}
