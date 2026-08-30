import { claimPendingJobs, completeJob, failJob } from "./ai-platform";

export type WorkerJob = {
  id: number;
  kind: string;
  payload: string;
  attempts: number;
  maxAttempts: number;
};

export type JobHandler = (job: WorkerJob, payload: Record<string, unknown>) => Promise<void>;

export const DEFAULT_POLL_INTERVAL_MS = 5_000;

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
      await handler(job, parsePayload(job.payload));
      await completeJob(job.id);
      succeeded += 1;
    } catch (error) {
      failed += 1;
      await failJob(job.id, error instanceof Error ? error.message : "Worker handler failed.");
    }
  }
  return { claimed: jobs.length, succeeded, failed };
}

export function createWorkerLoop(handlers: Record<string, JobHandler>, options: { intervalMs?: number; batchSize?: number } = {}) {
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
  createWorkerLoop({
    "orchestration.plan": orchestrationPlanHandler(async payload => {
      console.info(`[worker] orchestration plan ${String(payload.planId ?? "unknown")} accepted for durable processing`);
    }),
  });
  console.info(`[worker] started; poll interval=${DEFAULT_POLL_INTERVAL_MS}ms`);
}
