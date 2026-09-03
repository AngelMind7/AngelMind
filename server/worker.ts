import { claimPendingJobs, completeJob, dispatchPendingOutbox, executeAiRunJob, executeOrchestrationPlanJob, failJob, heartbeatJob, purgeExpiredAiRunMemory, refreshModelCatalog, type OutboxEventHandler } from "./ai-platform";
import { purgeExpiredAiMemories } from "./ai-memory";
import { executeEvidenceScanJob } from "./control-plane/service";
import { executeIntelligenceFetchJob } from "./research-intelligence";
import { executePrivacyRequest } from "./privacy-lifecycle";
import { executeEmailDeliveryJob } from "./email-delivery";
import { executePlaybookRunJob } from "./playbook-executor";
import { withTraceContext } from "./_core/trace-context";
import { executeNotificationDeliveryJob } from "./notification-delivery";

export type WorkerJob = {
  id: number;
  kind: string;
  payload: string;
  attempts: number;
  maxAttempts: number;
  traceId?: string | null;
};

export type JobHandler = (job: WorkerJob, payload: Record<string, unknown>) => Promise<void>;

export const DEFAULT_POLL_INTERVAL_MS = 5_000;
export const WORKER_HEARTBEAT_INTERVAL_MS = 10_000;
export const MODEL_CATALOG_REFRESH_INTERVAL_MS = 15 * 60_000;
export const MEMORY_PURGE_INTERVAL_MS = 15 * 60_000;
export const MAX_JOB_PAYLOAD_BYTES = 1_000_000;
export const MAX_TRACE_FIELD_LENGTH = 256;

export function computeRetryDelayMs(attempts: number, capMs = 60 * 60 * 1_000) {
  const safeAttempts = Number.isFinite(attempts) ? Math.max(1, Math.floor(attempts)) : 1;
  // Invalid deployment configuration must fail closed at the durable maximum,
  // not silently become a fast retry storm.
  if (!Number.isFinite(capMs)) return 60 * 60 * 1_000;
  const safeCapMs = Math.max(0, Math.floor(capMs));
  return Math.min(safeCapMs, 2 ** Math.max(0, safeAttempts - 1) * 5_000);
}

export function shouldDeadLetter(attempts: number, maxAttempts: number) {
  const safeAttempts = Number.isFinite(attempts) ? Math.max(0, Math.floor(attempts)) : 0;
  const safeMaxAttempts = Number.isFinite(maxAttempts) ? Math.max(1, Math.floor(maxAttempts)) : 1;
  return safeAttempts >= safeMaxAttempts;
}

export function parseJobPayload(payload: string): Record<string, unknown> {
  if (typeof payload !== "string" || new TextEncoder().encode(payload).byteLength > MAX_JOB_PAYLOAD_BYTES) {
    throw new Error("Job payload must be a JSON object within the size limit.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error("Job payload must be valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Job payload must be a JSON object.");
  return parsed as Record<string, unknown>;
}

export function resolveJobTraceContext(job: Pick<WorkerJob, "id" | "traceId">, payload: Record<string, unknown>) {
  const payloadTraceId = typeof payload.traceId === "string" ? payload.traceId.trim() : "";
  const jobTraceId = typeof job.traceId === "string" ? job.traceId.trim() : "";
  const payloadRequestId = typeof payload.requestId === "string" ? payload.requestId.trim() : "";
  const traceId = (payloadTraceId || jobTraceId || `job:${job.id}`).slice(0, MAX_TRACE_FIELD_LENGTH);
  const requestId = (payloadRequestId || `job:${job.id}`).slice(0, MAX_TRACE_FIELD_LENGTH);
  return { requestId, traceId };
}

export async function processAvailableJobs(handlers: Record<string, JobHandler>, limit = 10) {
  const safeLimit = Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit))) : 10;
  const jobs = await claimPendingJobs(safeLimit);
  let succeeded = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      const handler = handlers[job.kind];
      if (!handler) throw new Error(`No handler registered for job kind '${job.kind}'.`);
      const heartbeatTimer = setInterval(() => { void heartbeatJob(job.id).catch(() => undefined); }, WORKER_HEARTBEAT_INTERVAL_MS);
      heartbeatTimer.unref?.();
      try {
        const payload = parseJobPayload(job.payload);
        await withTraceContext(resolveJobTraceContext(job, payload), () => handler(job, payload));
      } finally {
        clearInterval(heartbeatTimer);
      }
      await completeJob(job.id);
      succeeded += 1;
    } catch (error) {
      failed += 1;
      await failJob(job.id, error instanceof Error ? error.message : "Worker handler failed.");
    }
  }
  return { claimed: jobs.length, succeeded, failed };
}

export function createWorkerLoop(handlers: Record<string, JobHandler>, options: { intervalMs?: number; batchSize?: number; outboxHandlers?: Record<string, OutboxEventHandler> } = {}) {
  const requestedIntervalMs = Number(options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS);
  const requestedBatchSize = Number(options.batchSize ?? 10);
  const intervalMs = Number.isFinite(requestedIntervalMs) ? Math.max(250, Math.floor(requestedIntervalMs)) : DEFAULT_POLL_INTERVAL_MS;
  const batchSize = Number.isFinite(requestedBatchSize) ? Math.min(100, Math.max(1, Math.floor(requestedBatchSize))) : 10;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;

  const tick = async () => {
    if (stopped || running) return;
    running = true;
    try {
      await processAvailableJobs(handlers, batchSize);
      if (options.outboxHandlers) await dispatchPendingOutbox(options.outboxHandlers, batchSize);
    } finally {
      running = false;
      if (!stopped) timer = setTimeout(() => void tick(), intervalMs);
    }
  };

  void tick();
  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}

export function orchestrationPlanHandler(onPlan: (payload: Record<string, unknown>) => Promise<void>): JobHandler {
  return async (_job, payload) => {
    if (payload.type !== "orchestration_plan") throw new Error("Unsupported orchestration payload type.");
    await onPlan(payload);
  };
}

if (process.env.RUN_WORKER === "true") {
  const refreshCatalog = async () => {
    try {
      const result = await refreshModelCatalog();
      console.info(`[worker] model catalog refresh discovered=${result.discovered} errors=${result.errors.length}`);
    } catch (error) {
      console.error(`[worker] model catalog refresh failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  };
  void refreshCatalog();
  const catalogTimer = setInterval(() => void refreshCatalog(), MODEL_CATALOG_REFRESH_INTERVAL_MS);
  catalogTimer.unref?.();
  const retentionTimer = setInterval(() => {
    void Promise.all([purgeExpiredAiRunMemory(100), purgeExpiredAiMemories(100)]).catch(error => console.error(`[worker] memory purge failed: ${error instanceof Error ? error.message : "unknown error"}`));
  }, MEMORY_PURGE_INTERVAL_MS);
  retentionTimer.unref?.();
  createWorkerLoop({
    "orchestration.plan": orchestrationPlanHandler(async payload => {
      await executeOrchestrationPlanJob(payload);
    }),
    "ai.run.execute": async (_job, payload) => executeAiRunJob(payload),
    "evidence.scan": async (_job, payload) => executeEvidenceScanJob(payload),
    "intelligence.fetch": async (_job, payload) => { await executeIntelligenceFetchJob(payload); },
    "privacy.process": async (_job, payload) => {
      if (payload.type !== "privacy_process" || typeof payload.requestId !== "number") throw new Error("Unsupported privacy payload type.");
      await executePrivacyRequest(payload.requestId);
    },
    "email.deliver": async (_job, payload) => {
      if (payload.type !== "email_delivery") throw new Error("Unsupported email delivery payload type.");
      await executeEmailDeliveryJob(payload);
    },
    "notification.deliver": async (_job, payload) => {
      if (payload.type !== "notification_delivery") throw new Error("Unsupported notification delivery payload type.");
      await executeNotificationDeliveryJob(payload);
    },
    "ai.memory.purge": async (_job, payload) => {
      if (payload.type !== "ai_memory_purge") throw new Error("Unsupported AI memory purge payload type.");
      const limit = typeof payload.limit === "number" ? payload.limit : 100;
      await Promise.all([purgeExpiredAiRunMemory(limit), purgeExpiredAiMemories(limit)]);
    },
    "playbook.run": async (_job, payload) => {
      if (payload.type !== "playbook_run") throw new Error("Unsupported playbook run payload type.");
      await executePlaybookRunJob(payload);
    },
  });
  console.info(`[worker] started; poll interval=${DEFAULT_POLL_INTERVAL_MS}ms`);
}
