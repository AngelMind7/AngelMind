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
  | "validation.12"
  | "validation.8"
  | "secrets_detection.1"
  | "source_code.1"
  | "source_code.19"
  | "source_code.22"
  | "source_code.9"
  | "binary_artifact_analysis.8"
  | "binary_artifact_analysis.2"
  | "binary_artifact_analysis.3"
  | "binary_artifact_analysis.23"
  | "source_code.10"
  | "source_code.23"
  | "secrets_detection.8"
  | "dependencies.20"
  | "dependencies.9"
  | "secrets_detection.6"
  | "source_code.18"
  | "supply_chain.3"
  | "validation.17"
  | "log_analysis.2"
  | "log_analysis.13"
  | "traffic_analysis.12"
  | "traffic_analysis.17"
  | "traffic_analysis.8"
  | "traffic_analysis.10"
  | "email_dns_security.1"
  | "email_dns_security.2"
  | "asset_intelligence.28"
  | "asset_intelligence.30"
  | "asset_intelligence.33"
  | "asset_intelligence.31"
  | "asset_intelligence.32"
  | "configuration.1"
  | "configuration.17"
  | "dependencies.3"
  | "dependencies.6"
  | "dependencies.11"
  | "dependencies.12"
  | "burp_suite_pro"
  | "jwt_tool"
  | "dalfox"
  | "ssrfmap"
  | "interactsh"
  | "ffuf"
  | "cloudfox"
  | "graphql_cop"
  | "sqlmap"
  | "nuclei"
  | "httpx"
  | "custom_scripts";

export type ToolRuntimeRequest = {
  toolKey: string;
  mode: "offline_artifact" | "passive_readonly" | "active_nondestructive" | "privileged_or_destructive";
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
  args: (inputPath: string, input: string) => string[] | null;
  allowedModes: ToolRuntimeRequest["mode"][];
  requiresTarget?: boolean;
};

const adapters: readonly Adapter[] = [
  {
    toolKey: "burp_suite_pro",
    binary: "burp-rest-cli",
    args: (inputPath, input) => [
      "--project", "/app/runtime/burp-project.burp",
      "--target", input,
      "--scan-config", "/etc/angelmind/burp-scan-config.json",
    ],
    allowedModes: ["passive_readonly", "active_nondestructive"],
    requiresTarget: true,
  },
  {
    toolKey: "jwt_tool",
    binary: "jwt_tool.py",
    args: (inputPath, input) => ["-t", input, "-M", "at"],
    allowedModes: ["active_nondestructive"],
    requiresTarget: true,
  },
  {
    toolKey: "dalfox",
    binary: "dalfox",
    args: (inputPath, input) => ["url", input, "--format", "json", "--silence"],
    allowedModes: ["active_nondestructive"],
    requiresTarget: true,
  },
  {
    toolKey: "ssrfmap",
    binary: "ssrfmap",
    args: (inputPath, input) => ["-r", inputPath, "-p", input],
    allowedModes: ["active_nondestructive"],
    requiresTarget: true,
  },
  {
    toolKey: "interactsh",
    binary: "interactsh-client",
    args: () => ["-json", "-poll-interval", "5"],
    allowedModes: ["passive_readonly"],
  },
  {
    toolKey: "ffuf",
    binary: "ffuf",
    args: (inputPath, input) => [
      "-u", input,
      "-w", "/etc/angelmind/wordlists/common.txt",
      "-of", "json",
      "-o", "-",
    ],
    allowedModes: ["active_nondestructive"],
    requiresTarget: true,
  },
  {
    toolKey: "cloudfox",
    binary: "cloudfox",
    args: () => ["aws", "all-checks", "--output", "json"],
    allowedModes: ["passive_readonly"],
  },
  {
    toolKey: "graphql_cop",
    binary: "graphql-cop",
    args: (inputPath, input) => ["-t", input, "-o", "json"],
    allowedModes: ["passive_readonly", "active_nondestructive"],
    requiresTarget: true,
  },
  {
    toolKey: "sqlmap",
    binary: "sqlmap",
    args: (inputPath, input) => [
      "-u", input,
      "--batch",
      "--output-dir=/tmp/angelmind-sqlmap",
      "--level=1",
      "--risk=1",
    ],
    allowedModes: ["privileged_or_destructive"],
    requiresTarget: true,
  },
  {
    toolKey: "nuclei",
    binary: "nuclei",
    args: (inputPath, input) => ["-u", input, "-jsonl", "-silent"],
    allowedModes: ["passive_readonly", "active_nondestructive"],
    requiresTarget: true,
  },
  {
    toolKey: "httpx",
    binary: "httpx",
    args: (inputPath, input) => ["-u", input, "-json", "-silent"],
    allowedModes: ["passive_readonly"],
    requiresTarget: true,
  },
  {
    toolKey: "custom_scripts",
    binary: "python3",
    args: inputPath => ["/app/runtime/custom_script_runner.py", inputPath],
    allowedModes: ["offline_artifact", "passive_readonly"],
  },
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
    toolKey: "validation.12",
    binary: "scalpel",
    args: inputPath => [
      "-q",
      "-o",
      "/tmp/angelmind-scalpel-output",
      "-i",
      inputPath,
    ],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "validation.8",
    binary: "log2timeline.py",
    args: inputPath => ["--quiet", "/tmp/angelmind-plaso.plaso", inputPath],
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
  {
    toolKey: "source_code.22",
    binary: "cppcheck",
    args: inputPath => ["--enable=all", "--xml", "--xml-version=2", inputPath],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "source_code.9",
    binary: "flawfinder",
    args: inputPath => ["--quiet", "--dataonly", inputPath],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "binary_artifact_analysis.8",
    binary: "gdb",
    args: inputPath => ["--batch", "--nx", "-ex", "info files", inputPath],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "binary_artifact_analysis.2",
    binary: "binwalk",
    args: inputPath => ["--quiet", inputPath],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "binary_artifact_analysis.3",
    binary: "python3",
    args: inputPath => ["/app/runtime/capstone_inspect.py", inputPath],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "binary_artifact_analysis.23",
    binary: "python3",
    args: inputPath => ["/app/runtime/unicorn_probe.py", inputPath],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "source_code.10",
    binary: "gosec",
    args: inputPath => [
      "-fmt=json",
      "-no-fail",
      "-exclude-generated",
      inputPath,
    ],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "source_code.23",
    binary: "njsscan",
    args: inputPath => ["--json", inputPath],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "secrets_detection.8",
    binary: "detect-secrets",
    args: inputPath => [
      "scan",
      "--all-files",
      "--force-use-all-plugins",
      "--json",
      inputPath,
    ],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "dependencies.20",
    binary: "pip-audit",
    args: inputPath => ["-r", inputPath, "-f", "json"],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "dependencies.9",
    binary: "safety",
    args: inputPath => ["check", "--file", inputPath, "--json"],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "secrets_detection.6",
    binary: "trufflehog",
    args: inputPath => ["--regex", "--entropy=False", "--json", inputPath],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "source_code.18",
    binary: "semgrep",
    args: inputPath => ["--config", "auto", "--json", "--quiet", inputPath],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "supply_chain.3",
    binary: "cyclonedx-py",
    args: inputPath => ["requirements", inputPath, "--output-format", "json"],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "validation.17",
    binary: "vol",
    args: inputPath => ["-f", inputPath, "windows.info"],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "log_analysis.2",
    binary: "chainsaw",
    args: inputPath => [
      "analyse",
      "gaps",
      "--json",
      "--skip-errors",
      inputPath,
    ],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "log_analysis.13",
    binary: "sigmac",
    args: inputPath => ["--target", "json", inputPath],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "traffic_analysis.12",
    binary: "tshark",
    args: inputPath => ["-r", inputPath, "-c", "100", "-T", "json"],
    allowedModes: ["passive_readonly"],
  },
  {
    toolKey: "traffic_analysis.17",
    binary: "tcpdump",
    args: inputPath => ["-nn", "-r", inputPath, "-c", "100"],
    allowedModes: ["passive_readonly"],
  },
  {
    toolKey: "traffic_analysis.8",
    binary: "snort",
    args: inputPath => [
      "-q",
      "-A",
      "console",
      "-c",
      "/etc/snort/snort.conf",
      "-r",
      inputPath,
    ],
    allowedModes: ["passive_readonly"],
  },
  {
    toolKey: "traffic_analysis.10",
    binary: "suricata",
    args: inputPath => [
      "-r",
      inputPath,
      "-l",
      "/tmp/angelmind-suricata",
      "-k",
      "none",
    ],
    allowedModes: ["passive_readonly"],
  },
  {
    toolKey: "email_dns_security.1",
    binary: "checkdmarc",
    args: (_inputPath, input) => {
      const domain = input.trim().toLowerCase();
      if (
        !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$/.test(
          domain
        )
      )
        return null;
      return [domain, "--json"];
    },
    allowedModes: ["passive_readonly"],
    requiresTarget: true,
  },
  {
    toolKey: "email_dns_security.2",
    binary: "python3",
    args: inputPath => ["/app/runtime/dkim_verify.py", inputPath],
    allowedModes: ["passive_readonly"],
  },
  {
    toolKey: "asset_intelligence.33",
    binary: "dnsx",
    args: (_inputPath, input) => {
      const domain = input.trim().toLowerCase();
      if (
        !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$/.test(
          domain
        )
      )
        return null;
      return [
        "-d",
        domain,
        "-a",
        "-aaaa",
        "-ns",
        "-mx",
        "-txt",
        "-caa",
        "-soa",
        "-json",
        "-silent",
        "-t",
        "1",
        "-rl",
        "5",
        "-retry",
        "1",
        "-duc",
      ];
    },
    allowedModes: ["passive_readonly"],
    requiresTarget: true,
  },
  {
    toolKey: "asset_intelligence.28",
    binary: "subfinder",
    args: (_inputPath, input) => {
      const domain = input.trim().toLowerCase();
      if (
        !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$/.test(
          domain
        )
      )
        return null;
      return ["-silent", "-d", domain, "-json", "-timeout", "20"];
    },
    allowedModes: ["passive_readonly"],
    requiresTarget: true,
  },
  {
    toolKey: "asset_intelligence.30",
    binary: "curl",
    args: (_inputPath, input) => {
      const domain = input.trim().toLowerCase();
      if (
        !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$/.test(
          domain
        )
      )
        return null;
      return [
        "--fail",
        "--silent",
        "--show-error",
        "--location",
        "--max-time",
        "20",
        "--retry",
        "1",
        "--user-agent",
        "AngelMind-passive-review/1.0",
        "https://crt.sh/?q=%25." + domain + "&output=json",
      ];
    },
    allowedModes: ["passive_readonly"],
    requiresTarget: true,
  },
  {
    toolKey: "asset_intelligence.32",
    binary: "dnstwist",
    args: (_inputPath, input) => {
      const domain = input.trim().toLowerCase();
      if (
        !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$/.test(
          domain
        )
      )
        return null;
      return ["--format", "json", "--registered", "--threads", "1", domain];
    },
    allowedModes: ["passive_readonly"],
    requiresTarget: true,
  },
  {
    toolKey: "asset_intelligence.31",
    binary: "dnsrecon",
    args: (_inputPath, input) => {
      const domain = input.trim().toLowerCase();
      if (
        !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$/.test(
          domain
        )
      )
        return null;
      return ["-d", domain, "-t", "std", "--threads", "1"];
    },
    allowedModes: ["passive_readonly"],
    requiresTarget: true,
  },
  {
    toolKey: "configuration.1",
    binary: "checkov",
    args: inputPath => ["-f", inputPath, "--output", "json"],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "configuration.17",
    binary: "tfsec",
    args: inputPath => [inputPath, "--format", "json"],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "dependencies.3",
    binary: "grype",
    args: inputPath => [inputPath, "-o", "json"],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "dependencies.6",
    binary: "osv-scanner",
    args: inputPath => ["scan", "source", "-r", inputPath, "--format", "json"],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "dependencies.11",
    binary: "syft",
    args: inputPath => [`file:${inputPath}`, "-o", "json"],
    allowedModes: ["offline_artifact"],
  },
  {
    toolKey: "dependencies.12",
    binary: "trivy",
    args: inputPath => ["fs", "--quiet", "--format", "json", inputPath],
    allowedModes: ["offline_artifact"],
  },
];

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_OUTPUT_BYTES = 512_000;
const MAX_OUTPUT_BYTES = 2_000_000;

const registeredAdapters = adapters.filter(adapter => Boolean(getToolCatalogEntry(adapter.toolKey)));
const adapterKeys = new Set(registeredAdapters.map(adapter => adapter.toolKey));

function getAdapter(toolKey: string) {
  return adapterKeys.has(toolKey as SupportedToolKey)
    ? registeredAdapters.find(adapter => adapter.toolKey === toolKey)
    : undefined;
}

function boundedText(value: string, maxBytes: number) {
  return Buffer.byteLength(value, "utf8") <= maxBytes
    ? value
    : `${value.slice(0, maxBytes)}\n[output truncated]`;
}

function executeAdapter(
  adapter: Adapter,
  inputPath: string,
  input: string,
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
    const args = adapter.args(inputPath, input);
    if (!args) {
      resolve({
        status: "blocked",
        exitCode: null,
        stdout: "",
        stderr: "",
        reason: "invalid_adapter_input",
      });
      return;
    }
    const child = spawn(adapter.binary, args, {
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
  return registeredAdapters.map(adapter => ({
    toolKey: adapter.toolKey,
    binary: adapter.binary,
    allowedModes: adapter.allowedModes,
    ...(adapter.requiresTarget ? { requiresTarget: true } : {}),
  }));
}

export function adapterRequiresTargetScope(toolKey: string) {
  return getAdapter(toolKey)?.requiresTarget ?? false;
}

export type RuntimePackId = "artifact-pack" | "analysis-pack" | "passive-pack" | "review-required-pack";

export function runtimePackForMode(mode: ToolRuntimeRequest["mode"]): RuntimePackId {
  return mode === "passive_readonly" ? "passive-pack" : "artifact-pack";
}

export function runtimePackAllows(mode: ToolRuntimeRequest["mode"]): boolean {
  const configured = process.env.RUNTIME_PACK_ID?.trim();
  return !configured || configured === runtimePackForMode(mode);
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
    }, 15_000);
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
        // A non-zero exit from --version can mean the binary does not support
        // that flag. The spawn itself proves the executable is present; only
        // an OS-level spawn error or timeout is an availability failure.
        available: true,
        version: code === 0 ? boundedText(stdout.trim(), 512) : undefined,
      });
    });
  });
}

export async function checkRegisteredAdapterHealth() {
  const health = await Promise.all(
    registeredAdapters.map(async adapter => ({
      toolKey: adapter.toolKey,
      binary: adapter.binary,
      ...(await probeBinary(adapter.binary)),
    }))
  );
  return health;
}

const RUNTIME_READINESS_CACHE_MS = 30_000;
type RuntimeReadiness = { configured: boolean; ready: boolean; missing: string[] };
let runtimeReadinessCache: { key: string; checkedAt: number; result: RuntimeReadiness } | null = null;

export async function checkRuntimeReadiness(): Promise<RuntimeReadiness> {
  const requiredBinaries = (process.env.RUNTIME_REQUIRED_BINARIES ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  const key = requiredBinaries.join(",");
  if (!requiredBinaries.length) {
    return { configured: false as const, ready: true as const, missing: [] as string[] };
  }
  const now = Date.now();
  if (runtimeReadinessCache?.key === key && now - runtimeReadinessCache.checkedAt < RUNTIME_READINESS_CACHE_MS) {
    return runtimeReadinessCache.result;
  }
  const registeredByBinary = new Map(registeredAdapters.map(adapter => [adapter.binary, adapter]));
  const health = await Promise.all(requiredBinaries.map(async binary => ({ binary, available: (await probeBinary(binary)).available, registered: registeredByBinary.has(binary) })));
  const missing = health.filter(item => !item.available || !item.registered).map(item => item.binary);
  const result = { configured: true as const, ready: missing.length === 0, missing };
  runtimeReadinessCache = { key, checkedAt: now, result };
  return result;
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
  if (!runtimePackAllows(request.mode))
    return result("blocked", "runtime_pack_mismatch");
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
      request.input,
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
