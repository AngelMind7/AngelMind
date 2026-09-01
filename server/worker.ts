import { claimPendingJobs, completeJob, dispatchPendingOutbox, executeAiRunJob, executeOrchestrationPlanJob, failJob, heartbeatJob, refreshModelCatalog, type OutboxEventHandler } from "./ai-platform";
import { executeEvidenceScanJob } from "./control-plane/service";
import { executeIntelligenceFetchJob } from "./research-intelligence";
import { executePrivacyRequest } from "./privacy-lifecycle";
import { executeEmailDeliveryJob } from "./email-delivery";
import { executePlaybookRunJob } from "./playbook-executor";

export type WorkerJob = {
  id: number;
  kind: string;
  payload: string;
  attempts: number;
  maxAttempts: number;
};

export type JobHandler = (job: WorkerJob, payload: Record<string, unknown>) => Promise<void>;

export const DEFAULT_POLL_INTERVAL_MS = 5_000;
export const MODEL_CATALOG_REFRESH_INTERVAL_MS = 15 * 60_000;

export function computeRetryDelayMs(attempts: number, capMs = 60 * 60 * 1_000) {
  const safeAttempts = Math.max(1, Math.floor(attempts));
  return Math.min(capMs, 2 ** Math.max(0, safeAttempts - 1) * 5_000);
}

export function shouldDeadLetter(attempts: number, maxAttempts: number) {
  return attempts >= Math.max(1, maxAttempts);
}

function parsePayload(payload: string) {
  const parsed: unknown = JSON.parse(payload);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Job payload must be a JSON object.");
  return parsed as Record<string, unknown>;
}

export async function processAvailableJobs(handlers: Record<string, JobHandler>, limit = 10) {
  const jobs = await claimPendingJobs(limit);
  let succeeded = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      const handler = handlers[job.kind];
      if (!handler) throw new Error(`No handler registered for job kind '${job.kind}'.`);
      const heartbeatTimer = setInterval(() => { void heartbeatJob(job.id).catch(() => undefined); }, 15_000);
      heartbeatTimer.unref?.();
      try {
        await handler(job, parsePayload(job.payload));
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
  const intervalMs = Math.max(250, options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS);
  const batchSize = Math.min(100, Math.max(1, options.batchSize ?? 10));
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
    "playbook.run": async (_job, payload) => {
      if (payload.type !== "playbook_run") throw new Error("Unsupported playbook run payload type.");
      await executePlaybookRunJob(payload);
    },
  });
  console.info(`[worker] started; poll interval=${DEFAULT_POLL_INTERVAL_MS}ms`);
}
