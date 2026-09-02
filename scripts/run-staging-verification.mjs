#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const required = name => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const databaseUrl = required("DATABASE_URL");
const allow = process.env.ALLOW_STAGING_TESTS === "true";
if (!allow) {
  throw new Error(
    "Refusing to run staging tests. Set ALLOW_STAGING_TESTS=true explicitly."
  );
}
if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to run staging tests with NODE_ENV=production.");
}
if (/mysql\.railway\.internal|production/i.test(databaseUrl)) {
  throw new Error(
    "Refusing to run staging tests against a production/internal Railway database. Use a dedicated staging database."
  );
}

const run = (command, args, env = {}) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

console.log(
  "Running database integration tests against the explicitly approved staging database."
);
run(
  "pnpm",
  [
    "exec",
    "vitest",
    "run",
    "server/ai-memory-retention.integration.test.ts",
    "server/ai-memory-context.integration.test.ts",
    "server/global-search.integration.test.ts",
  ],
  {
    DATABASE_URL: databaseUrl,
  }
);

const baseUrl = process.env.E2E_BASE_URL?.trim();
const token = process.env.ANGELMIND_E2E_TOKEN?.trim();
if (baseUrl && token) {
  if (
    !/^https:\/\//i.test(baseUrl) &&
    !/localhost|127\.0\.0\.1/i.test(baseUrl)
  ) {
    throw new Error(
      "E2E_BASE_URL must use HTTPS unless it points to localhost."
    );
  }
  console.log(
    "Running authenticated lifecycle E2E against the explicitly provided staging URL."
  );
  run(
    "pnpm",
    [
      "exec",
      "playwright",
      "test",
      "e2e/authenticated-lifecycle.contract.spec.ts",
    ],
    {
      E2E_BASE_URL: baseUrl,
      ANGELMIND_E2E_TOKEN: token,
    }
  );
} else {
  console.log(
    "Skipping authenticated E2E: provide both E2E_BASE_URL and ANGELMIND_E2E_TOKEN to enable it."
  );
}

console.log("Staging verification completed.");
