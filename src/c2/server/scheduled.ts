import { closeDb } from "./db";
import { runAllScheduledJobs } from "./scheduled-maintenance";
import { validateRuntimeConfig } from "./_core/env";

async function main() {
  validateRuntimeConfig();
  const result = await runAllScheduledJobs(new Date());
  console.info(`[scheduled] completed ok=${result.ok} jobs=${result.results.length}`);
  if (!result.ok) process.exitCode = 1;
}

void main()
  .catch(error => {
    console.error(`[scheduled] failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb().catch(error => console.error(`[scheduled] database close failed: ${error instanceof Error ? error.message : String(error)}`));
  });
