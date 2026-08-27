import Audit from "@/pages/Audit";
import Assurance from "@/pages/Assurance";
import Findings from "@/pages/Findings";
import Governance from "@/pages/Governance";
import Home from "@/pages/Home";
import Notifications from "@/pages/Notifications";
import Operations from "@/pages/Operations";
import OperationsAdmin from "@/pages/OperationsAdmin";
import Workspaces from "@/pages/Workspaces";

export const authenticatedRoutes = [
  { path: "/", component: Home }, { path: "/workspaces", component: Workspaces }, { path: "/governance", component: Governance }, { path: "/findings", component: Findings }, { path: "/audit", component: Audit }, { path: "/operations", component: Operations }, { path: "/notifications", component: Notifications }, { path: "/operations-console", component: OperationsAdmin }, { path: "/assurance", component: Assurance },
] as const;
