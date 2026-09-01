import { afterEach, describe, expect, it } from "vitest";
import { validateRuntimeConfig } from "./env";

const names = ["DATABASE_URL", "APP_ENCRYPTION_KEY", "FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET", "RAILWAY_CRON_SECRET"];
const saved = Object.fromEntries(names.map(name => [name, process.env[name]]));

afterEach(() => {
  for (const name of names) {
    const value = saved[name];
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
});

describe("runtime configuration", () => {
  it("does not require provider secrets outside production", () => {
    expect(validateRuntimeConfig({ production: false })).toEqual({ production: false, missing: [] });
  });

  it("fails closed for incomplete production configuration", () => {
    for (const name of names) delete process.env[name];
    expect(() => validateRuntimeConfig({ production: true })).toThrow(/DATABASE_URL/);
  });
});
