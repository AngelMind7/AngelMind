import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { randomUUID } from "node:crypto";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  requestId: string;
  traceId: string;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  const requestId = typeof opts.req.header("x-request-id") === "string" && opts.req.header("x-request-id")!.length <= 128 ? opts.req.header("x-request-id")! : randomUUID();
  const traceId = typeof opts.req.header("x-trace-id") === "string" && opts.req.header("x-trace-id")!.length <= 128 ? opts.req.header("x-trace-id")! : requestId;
  opts.res.setHeader("x-request-id", requestId);
  opts.res.setHeader("x-trace-id", traceId);

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    requestId,
    traceId,
  };
}
