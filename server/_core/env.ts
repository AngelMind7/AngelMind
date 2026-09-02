import { parseFeatureFlags } from "../feature-flags";

export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  archiveSigningSecret: process.env.AUDIT_ARCHIVE_SIGNING_KEY ?? process.env.APP_ENCRYPTION_KEY ?? "",
  auditStateEncryptionKey: process.env.AUDIT_STATE_ENCRYPTION_KEY ?? "",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "",
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY ?? "",
  adminFirebaseUids: (process.env.ADMIN_FIREBASE_UIDS ?? "").split(",").map(value => value.trim()).filter(Boolean),
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "angelmind-files",
  railwayCronSecret: process.env.RAILWAY_CRON_SECRET ?? "",
  appBaseUrl: process.env.APP_BASE_URL ?? process.env.PUBLIC_APP_URL ?? "http://localhost:3000",
  llmPrimaryApiUrl: process.env.LLM_PRIMARY_API_BASE_URL ?? process.env.LLM_API_BASE_URL ?? "",
  llmPrimaryApiKey: process.env.LLM_PRIMARY_API_KEY ?? process.env.LLM_API_KEY ?? "",
  llmPrimaryModel: process.env.LLM_PRIMARY_MODEL ?? process.env.LLM_MODEL ?? "",
  llmFallbackApiUrl: process.env.LLM_FALLBACK_API_BASE_URL ?? "",
  llmFallbackApiKey: process.env.LLM_FALLBACK_API_KEY ?? "",
  llmFallbackModel: process.env.LLM_FALLBACK_MODEL ?? "",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPassword: process.env.SMTP_PASSWORD ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "",
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpTimeoutMs: Number(process.env.SMTP_TIMEOUT_MS ?? 10_000),
  isProduction: process.env.NODE_ENV === "production",
  featureFlagsRaw: process.env.FEATURE_FLAGS ?? "{}",
};

export function getSmtpConfig() {
  const { smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, smtpSecure, smtpTimeoutMs } = ENV;
  if (!smtpHost || !smtpFrom) return null;
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) throw new Error("SMTP_PORT must be a valid TCP port.");
  if (!Number.isInteger(smtpTimeoutMs) || smtpTimeoutMs < 1000) throw new Error("SMTP_TIMEOUT_MS must be at least 1000 milliseconds.");
  return { host: smtpHost, port: smtpPort, auth: smtpUser ? { user: smtpUser, pass: smtpPassword } : undefined, from: smtpFrom, secure: smtpSecure, connectionTimeout: smtpTimeoutMs, greetingTimeout: smtpTimeoutMs, socketTimeout: smtpTimeoutMs };
}

export type SmtpConfig = NonNullable<ReturnType<typeof getSmtpConfig>>;

export function validateRuntimeConfig(options: { production?: boolean } = {}) {
  const production = options.production ?? ENV.isProduction;
  if (!production) return { production: false as const, missing: [] as string[] };

  const missing: string[] = [];
  const required = (name: string, value: string) => { if (!value.trim()) missing.push(name); };
  required("DATABASE_URL", ENV.databaseUrl);
  required("APP_ENCRYPTION_KEY", process.env.APP_ENCRYPTION_KEY ?? "");
  required("AUDIT_STATE_ENCRYPTION_KEY", ENV.auditStateEncryptionKey);
  required("FIREBASE_PROJECT_ID", ENV.firebaseProjectId);
  required("FIREBASE_CLIENT_EMAIL", ENV.firebaseClientEmail);
  required("FIREBASE_PRIVATE_KEY", ENV.firebasePrivateKey);
  required("SUPABASE_URL", ENV.supabaseUrl);
  required("SUPABASE_SERVICE_ROLE_KEY", ENV.supabaseServiceRoleKey);
  required("SUPABASE_STORAGE_BUCKET", ENV.supabaseStorageBucket);
  required("RAILWAY_CRON_SECRET", ENV.railwayCronSecret);
  if (ENV.supabaseUrl && (!ENV.supabaseUrl.startsWith("https://") || !ENV.supabaseUrl.includes(".supabase.co"))) missing.push("SUPABASE_URL(approved-https-host)");
  if (ENV.railwayCronSecret && ENV.railwayCronSecret.length < 32) missing.push("RAILWAY_CRON_SECRET(min-32-chars)");
  if (process.env.APP_ENCRYPTION_KEY && process.env.APP_ENCRYPTION_KEY.length < 32) missing.push("APP_ENCRYPTION_KEY(min-32-chars)");
  if (missing.length) throw new Error(`Production runtime configuration incomplete: ${missing.join(", ")}`);
  return { production: true as const, missing: [] as string[] };
}

export function getRuntimeFeatureFlags() {
  return parseFeatureFlags(ENV.featureFlagsRaw);
}

export function isSmtpConfigured() {
  return Boolean(ENV.smtpHost && ENV.smtpFrom);
}

export function redactSmtpConfig(config: SmtpConfig) {
  return { ...config, auth: config.auth ? { user: config.auth.user, pass: "[REDACTED]" } : undefined };
}
