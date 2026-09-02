import { closeDb } from "./db";
import { runScheduledAdministrativeChecks } from "./control-plane/service";
import { validateRuntimeConfig } from "./_core/env";

async function main() {
  validateRuntimeConfig();
  const result = await runScheduledAdministrativeChecks(new Date());
  if (!result.ok) throw new Error(`Scheduled maintenance could not run: ${result.reason}`);
  console.info(`[scheduled] completed processed=${result.processed} failed=${result.failed} skipped=${result.skipped}`);
  if (result.failed > 0) process.exitCode = 1;
}

void main()
  .catch(error => {
    console.error(`[scheduled] failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb().catch(error => console.error(`[scheduled] database close failed: ${error instanceof Error ? error.message : String(error)}`));
  });
