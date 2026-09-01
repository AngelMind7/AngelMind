export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  archiveSigningSecret: process.env.AUDIT_ARCHIVE_SIGNING_KEY ?? process.env.APP_ENCRYPTION_KEY ?? "",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "",
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY ?? "",
  adminFirebaseUids: (process.env.ADMIN_FIREBASE_UIDS ?? "").split(",").map(value => value.trim()).filter(Boolean),
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "angelmind-files",
  railwayCronSecret: process.env.RAILWAY_CRON_SECRET ?? "",
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
};

export function getSmtpConfig() {
  const { smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, smtpSecure, smtpTimeoutMs } = ENV;
  if (!smtpHost || !smtpFrom) return null;
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) throw new Error("SMTP_PORT must be a valid TCP port.");
  if (!Number.isInteger(smtpTimeoutMs) || smtpTimeoutMs < 1000) throw new Error("SMTP_TIMEOUT_MS must be at least 1000 milliseconds.");
  return { host: smtpHost, port: smtpPort, auth: smtpUser ? { user: smtpUser, pass: smtpPassword } : undefined, from: smtpFrom, secure: smtpSecure, connectionTimeout: smtpTimeoutMs, greetingTimeout: smtpTimeoutMs, socketTimeout: smtpTimeoutMs };
}

export type SmtpConfig = NonNullable<ReturnType<typeof getSmtpConfig>>;

export function isSmtpConfigured() {
  return Boolean(ENV.smtpHost && ENV.smtpFrom);
}

export function redactSmtpConfig(config: SmtpConfig) {
  return { ...config, auth: config.auth ? { user: config.auth.user, pass: "[REDACTED]" } : undefined };
}
