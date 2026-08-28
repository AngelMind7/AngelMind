import { lazy } from "react";

export const authenticatedRoutes = [
  { path: "/", component: lazy(() => import("@/pages/Home")) }, { path: "/app", component: lazy(() => import("@/pages/Home")) }, { path: "/workspaces", component: lazy(() => import("@/pages/Workspaces")) }, { path: "/governance", component: lazy(() => import("@/pages/Governance")) }, { path: "/findings", component: lazy(() => import("@/pages/Findings")) }, { path: "/audit", component: lazy(() => import("@/pages/Audit")) }, { path: "/operations", component: lazy(() => import("@/pages/Operations")) }, { path: "/notifications", component: lazy(() => import("@/pages/Notifications")) }, { path: "/operations-console", component: lazy(() => import("@/pages/OperationsAdmin")) }, { path: "/assurance", component: lazy(() => import("@/pages/Assurance")) },
] as const;
