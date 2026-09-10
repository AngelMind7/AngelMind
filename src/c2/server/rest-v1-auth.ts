import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { authenticateApiKeyWithScopes } from "./security-platform";

export type RestAuth = { user: NonNullable<Awaited<ReturnType<typeof sdk.authenticateRequest>>>; workspaceId?: number | null };

function bearer(header: string | undefined) {
  const match = /^Bearer\s+(.+)$/i.exec(header ?? "");
  return match?.[1]?.trim() || null;
}

export async function requireRestUser(req: Request, requiredScope?: string): Promise<RestAuth> {
  const token = bearer(req.header("authorization"));
  if (token?.startsWith("am_")) {
    const result = await authenticateApiKeyWithScopes(token);
    if (!result) throw new Error("Authentication required.");
    if (requiredScope && !result.scopes.includes(requiredScope) && !result.scopes.includes("*")) throw new Error("API key scope is insufficient.");
    return { user: result.user, workspaceId: result.workspaceId };
  }
  const user = await sdk.authenticateRequest(req);
  if (!user) throw new Error("Authentication required.");
  return { user };
}

export function restError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed.";
  const status = message.includes("Authentication required") ? 401 : message.includes("tidak dapat diakses") ? 403 : message.includes("tidak ditemukan") ? 404 : message.includes("Database tidak tersedia") ? 503 : 400;
  const code = status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : status === 503 ? "DEPENDENCY_UNAVAILABLE" : "BAD_REQUEST";
  res.status(status).json({ error: true, code, message, details: {}, request_id: res.locals.requestId, apiVersion: "v1" });
}
