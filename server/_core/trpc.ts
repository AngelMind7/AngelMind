import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { withTraceContext } from "./trace-context";
import { canAccessWorkspace } from "../control-plane/operations";
import {
  permissionNeedsWorkspaceRole,
  routedProcedurePermissions,
  type RoutePermission,
} from "../control-plane/route-permissions";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  const user = ctx.user;
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return withTraceContext(
    { requestId: ctx.requestId, traceId: ctx.traceId },
    () =>
      next({
        ctx: {
          ...ctx,
          user,
        },
      })
  );
});

const enforceWorkspaceRole = t.middleware(async opts => {
  const permission = routedProcedurePermissions[
    opts.path as keyof typeof routedProcedurePermissions
  ] as RoutePermission | undefined;
  const input = opts.input;
  const workspaceId =
    input &&
    typeof input === "object" &&
    "workspaceId" in input &&
    typeof input.workspaceId === "number"
      ? input.workspaceId
      : undefined;
  if (!permission) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Route permission is not configured.",
    });
  }
  if (
    !permissionNeedsWorkspaceRole(permission) ||
    permission === "distinct-reviewer" ||
    permission === "admin-or-distinct-reviewer" ||
    workspaceId === undefined
  )
    return opts.next();
  const intent =
    permission === "owner"
      ? "manage"
      : permission === "responder"
        ? "respond"
        : "read";
  if (!(await ctxUserCanAccess(opts.ctx.user?.id, workspaceId, intent)))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Workspace role does not permit this operation.",
    });
  return opts.next();
});

async function ctxUserCanAccess(
  userId: number | undefined,
  workspaceId: number,
  intent: "read" | "review" | "respond" | "manage"
) {
  return (
    userId !== undefined && canAccessWorkspace(userId, workspaceId, intent)
  );
}

export const protectedProcedure = t.procedure
  .use(requireUser)
  .use(enforceWorkspaceRole);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  })
);
