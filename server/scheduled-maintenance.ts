import { purgeExpiredAiRunMemory, recoverStaleOutboxLeases } from "./ai-platform";
import { expirePendingApprovals, runScheduledAdministrativeChecks } from "./control-plane/service";
import { getScheduledJobDefinition, type ScheduledJobDefinition } from "./control-plane/scheduler";

type ScheduledJobKey = ScheduledJobDefinition["key"];

export async function runScheduledJob(key: ScheduledJobKey, now = new Date()) {
  const definition = getScheduledJobDefinition(key);
  if (!definition) throw new Error(`Unknown scheduled job: ${key}`);
  switch (key) {
    case "workspace-maintenance":
      return { key, definition, result: await runScheduledAdministrativeChecks(now) };
    case "approval-expiry":
      return { key, definition, result: await expirePendingApprovals() };
    case "ai-memory-retention":
      return { key, definition, result: await purgeExpiredAiRunMemory() };
    case "outbox-recovery":
      return { key, definition, result: await recoverStaleOutboxLeases() };
  }
}

export async function runAllScheduledJobs(now = new Date()) {
  const keys: ScheduledJobKey[] = ["workspace-maintenance", "approval-expiry", "ai-memory-retention", "outbox-recovery"];
  const results = await Promise.allSettled(keys.map(key => runScheduledJob(key, now)));
  return {
    ok: results.every(result => result.status === "fulfilled"),
    results: results.map((result, index) => ({ key: keys[index], status: result.status, ...(result.status === "fulfilled" ? { result: result.value } : { error: String(result.reason) }) })),
  };
}
