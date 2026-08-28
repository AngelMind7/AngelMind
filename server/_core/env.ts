export const ENV = {
  // Firebase project ID replaces the old Manus app ID for local sessions.
  appId: process.env.FIREBASE_PROJECT_ID ?? process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  llmPrimaryApiUrl: process.env.LLM_PRIMARY_API_BASE_URL ?? process.env.LLM_API_BASE_URL ?? "",
  llmPrimaryApiKey: process.env.LLM_PRIMARY_API_KEY ?? process.env.LLM_API_KEY ?? "",
  llmPrimaryModel: process.env.LLM_PRIMARY_MODEL ?? process.env.LLM_MODEL ?? "",
  llmFallbackApiUrl: process.env.LLM_FALLBACK_API_BASE_URL ?? "",
  llmFallbackApiKey: process.env.LLM_FALLBACK_API_KEY ?? "",
  llmFallbackModel: process.env.LLM_FALLBACK_MODEL ?? "",
};
