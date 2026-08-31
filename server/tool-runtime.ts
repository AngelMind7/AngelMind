import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import {
  getToolCatalogEntry,
  canExecuteTool,
  type ToolCatalogEntry,
} from "./tool-catalog";

type SupportedToolKey =
  | "binary_artifact_analysis.24"
  | "binary_artifact_analysis.30"
  | "validation.6"
  | "validation.13"
  | "validation.19"
  | "secrets_detection.1"
  | "source_code.1"
  | "source_code.19";

export type ToolRuntimeRequest = {
  toolKey: string;
  mode: "offline_artifact" | "passive_readonly";
  scopeValidated: boolean;
  humanApproval: boolean;
  input: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
};

export type ToolRuntimeResult = {
  requestId: string;
  toolKey: string;
  status: "completed" | "failed" | "unavailable" | "blocked" | "timed_out";
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  reason?: string;
};

type Adapter = {
  toolKey: SupportedToolKey;
  binary: string;
  args: (inputPath: string) => string[];
  allowedModes: ToolRuntimeRequest["mode"][];
};

const adapters: readonly Adapter[] = [
  {
    toolKey: "binary_artifact_analysis.24",
    binary: "yara",
    args: inputPath => [
      "--fail-on-warnings",
      "--print-meta",
      "--print-namespace",
      "/etc/angelmind/rules.yar",
      inputPath,
    ],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "binary_artifact_analysis.30",
    binary: "objdump",
    args: inputPath => ["-f", "-h", "--", inputPath],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "validation.6",
    binary: "foremost",
    args: inputPath => [
      "-q",
      "-i",
      inputPath,
      "-o",
      "/tmp/angelmind-foremost-output",
    ],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "validation.13",
    binary: "mmls",
    args: inputPath => ["-B", inputPath],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "validation.19",
    binary: "dc3dd",
    args: inputPath => ["if=" + inputPath, "of=/dev/null", "hash=sha256"],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "secrets_detection.1",
    binary: "gitleaks",
    args: inputPath => [
      "dir",
      "--no-banner",
      "--redact",
      "--report-format",
      "json",
      "--report-path",
      "-",
      inputPath,
    ],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "source_code.1",
    binary: "bandit",
    args: inputPath => ["-q", "-f", "json", inputPath],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "source_code.19",
    binary: "shellcheck",
    args: inputPath => ["--format=json", inputPath],
    allowedModes: ["offline_artifact"],
  },
];

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_OUTPUT_BYTES = 512_000;
const MAX_OUTPUT_BYTES = 2_000_000;

function getAdapter(toolKey: string) {
  return adapters.find(adapter => adapter.toolKey === toolKey);
}

function boundedText(value: string, maxBytes: number) {
  return Buffer.byteLength(value, "utf8") <= maxBytes
    ? value
    : `${value.slice(0, maxBytes)}\n[output truncated]`;
}

function executeAdapter(
  adapter: Adapter,
  inputPath: string,
  timeoutMs: number,
  maxOutputBytes: number
) {
  return new Promise<{
    status: ToolRuntimeResult["status"];
    exitCode: number | null;
    stdout: string;
    stderr: string;
    reason?: string;
  }>(resolve => {
    const child = spawn(adapter.binary, adapter.args(inputPath), {
      cwd: "/tmp",
      env: {
        PATH: process.env.PATH ?? "/usr/bin:/bin",
        LANG: "C",
        LC_ALL: "C",
      },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (result: {
      status: ToolRuntimeResult["status"];
      exitCode: number | null;
      reason?: string;
    }) => {
      if (settled) return;
      settled = true;
      resolve({
        ...result,
        stdout: boundedText(stdout, maxOutputBytes),
        stderr: boundedText(stderr, maxOutputBytes),
      });
    };
    child.stdout.on("data", chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", chunk => {
      stderr += chunk.toString();
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish({
        status: "timed_out",
        exitCode: null,
        reason: "runtime_timeout",
      });
    }, timeoutMs);
    child.once("error", error => {
      clearTimeout(timer);
      finish({
        status: "unavailable",
        exitCode: null,
        reason: error.message.includes("ENOENT")
          ? "binary_unavailable"
          : "runtime_error",
      });
    });
    child.once("close", code => {
      clearTimeout(timer);
      finish({ status: code === 0 ? "completed" : "failed", exitCode: code });
    });
  });
}

export function listRegisteredAdapters() {
  return adapters.map(adapter => ({
    toolKey: adapter.toolKey,
    binary: adapter.binary,
    allowedModes: adapter.allowedModes,
  }));
}

function probeBinary(binary: string) {
  return new Promise<{ available: boolean; version?: string }>(resolve => {
    const child = spawn(binary, ["--version"], {
      cwd: "/tmp",
      env: {
        PATH: process.env.PATH ?? "/usr/bin:/bin",
        LANG: "C",
        LC_ALL: "C",
      },
      shell: false,
      stdio: ["ignore", "pipe", "ignore"],
    });
    let stdout = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ available: false });
    }, 5_000);
    child.stdout.on("data", chunk => {
      stdout += chunk.toString();
    });
    child.once("error", () => {
      clearTimeout(timer);
      resolve({ available: false });
    });
    child.once("close", code => {
      clearTimeout(timer);
      resolve({
        available: code === 0,
        version: code === 0 ? boundedText(stdout.trim(), 512) : undefined,
      });
    });
  });
}

export async function checkRegisteredAdapterHealth() {
  const health = await Promise.all(
    adapters.map(async adapter => ({
      toolKey: adapter.toolKey,
      binary: adapter.binary,
      ...(await probeBinary(adapter.binary)),
    }))
  );
  return health;
}

export async function runRegisteredTool(
  request: ToolRuntimeRequest
): Promise<ToolRuntimeResult> {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const tool = getToolCatalogEntry(request.toolKey);
  const adapter = getAdapter(request.toolKey);
  const timeoutMs = Math.min(
    Math.max(request.timeoutMs ?? DEFAULT_TIMEOUT_MS, 1_000),
    MAX_TIMEOUT_MS
  );
  const maxOutputBytes = Math.min(
    Math.max(request.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES, 1_024),
    MAX_OUTPUT_BYTES
  );
  const base = {
    requestId,
    toolKey: request.toolKey,
    exitCode: null,
    stdout: "",
    stderr: "",
    durationMs: 0,
  };
  const result = (
    status: ToolRuntimeResult["status"],
    reason: string
  ): ToolRuntimeResult => ({
    ...base,
    status,
    reason,
    durationMs: Date.now() - startedAt,
  });

  if (!tool) return result("blocked", "tool_not_found");
  if (!adapter) return result("unavailable", "adapter_not_registered");
  if (!adapter.allowedModes.includes(request.mode))
    return result("blocked", "mode_not_supported");
  if (
    request.input.length === 0 ||
    Buffer.byteLength(request.input, "utf8") > 2_000_000
  )
    return result("blocked", "input_limit_exceeded");

  const decision = canExecuteTool({
    toolKey: request.toolKey,
    mode: request.mode,
    scopeValidated: request.scopeValidated,
    humanApproval: request.humanApproval,
  });
  if (!decision.allowed) return result("blocked", decision.reason);

  let workspace: string | undefined;
  try {
    workspace = await mkdtemp(join(tmpdir(), "angelmind-runtime-"));
    const inputPath = join(workspace, "input.bin");
    await writeFile(inputPath, request.input, { mode: 0o600 });
    const execution = await executeAdapter(
      adapter,
      inputPath,
      timeoutMs,
      maxOutputBytes
    );
    return { ...base, ...execution, durationMs: Date.now() - startedAt };
  } finally {
    if (workspace) await rm(workspace, { recursive: true, force: true });
  }
}

export function describeToolRuntime(toolKey: string): {
  tool: ToolCatalogEntry | undefined;
  adapter: ReturnType<typeof getAdapter>;
} {
  return { tool: getToolCatalogEntry(toolKey), adapter: getAdapter(toolKey) };
}
