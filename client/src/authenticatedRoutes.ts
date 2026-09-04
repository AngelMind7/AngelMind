import { lazy } from "react";

const home = lazy(() => import("@/pages/Home"));
const mission = lazy(() => import("@/pages/MissionControl"));
const coverage = lazy(() => import("@/pages/Coverage"));
const researcher = lazy(() => import("@/pages/Researcher"));
const ai = lazy(() => import("@/pages/AICenter"));
const research = lazy(() => import("@/pages/ResearchWorkspace"));
const knowledge = lazy(() => import("@/pages/KnowledgeGraph"));
const search = lazy(() => import("@/pages/Search"));
const collaboration = lazy(() => import("@/pages/Collaboration"));
const savedViews = lazy(() => import("@/pages/SavedViews"));
const tagsNotes = lazy(() => import("@/pages/TagsNotes"));
const assets = lazy(() => import("@/pages/Inventory"));
const tools = lazy(() => import("@/pages/Tools"));
const reports = lazy(() => import("@/pages/ReportStudio"));
const workspaces = lazy(() => import("@/pages/Workspaces"));
const organizations = lazy(() => import("@/pages/Organizations"));
const governance = lazy(() => import("@/pages/Governance"));
const findings = lazy(() => import("@/pages/Findings"));
const audit = lazy(() => import("@/pages/Audit"));
const operations = lazy(() => import("@/pages/Operations"));
const assurance = lazy(() => import("@/pages/Assurance"));
const incidents = lazy(() => import("@/pages/Incidents"));
const security = lazy(() => import("@/pages/Security"));
const notifications = lazy(() => import("@/pages/Notifications"));
const profile = lazy(() => import("@/pages/Profile"));
const operationsAdmin = lazy(() => import("@/pages/OperationsAdmin"));
const blueprintModule = lazy(() => import("@/pages/BlueprintModule"));
const clientPortal = lazy(() => import("@/pages/ClientPortal"));

export const authenticatedRoutes = [
  { path: "/app", component: home }, { path: "/dashboard", component: home },
  { path: "/mission", component: mission }, { path: "/mission-control", component: mission }, { path: "/coverage", component: coverage }, { path: "/researcher", component: researcher },
  { path: "/ai-center", component: ai }, { path: "/ai", component: ai }, { path: "/ai/providers", component: ai }, { path: "/ai/models", component: ai }, { path: "/ai/connections", component: ai }, { path: "/ai/routing", component: ai }, { path: "/ai/usage", component: ai },
  { path: "/research", component: research }, { path: "/research/new", component: research }, { path: "/research/:id/objectives", component: research }, { path: "/research/:id/hypotheses", component: research }, { path: "/research/:id/tasks", component: research }, { path: "/research/:id/executions", component: research }, { path: "/research/:id/observations", component: research }, { path: "/research/:id/evidence", component: research }, { path: "/research/:id/findings", component: research }, { path: "/research/:id/reports", component: research }, { path: "/research/:id/timeline", component: research }, { path: "/research/:id", component: research },
  { path: "/knowledge", component: knowledge }, { path: "/search", component: search }, { path: "/collaboration", component: collaboration }, { path: "/collaboration/review/:id", component: collaboration }, { path: "/collaboration/invites", component: collaboration }, { path: "/saved-views", component: savedViews }, { path: "/tags-notes", component: tagsNotes }, { path: "/tags", component: tagsNotes }, { path: "/notes", component: tagsNotes },
  { path: "/assets", component: assets }, { path: "/assets/new", component: assets }, { path: "/assets/:id", component: assets }, { path: "/inventory", component: assets },
  { path: "/tools", component: tools }, { path: "/tools/capabilities", component: tools }, { path: "/tools/installed", component: tools }, { path: "/tools/health", component: tools }, { path: "/tools/history", component: tools }, { path: "/tools/:id", component: tools },
  { path: "/ai/workers", component: blueprintModule }, { path: "/ai/workers/new", component: blueprintModule }, { path: "/ai/workers/:id", component: blueprintModule },
  { path: "/utf/runners", component: blueprintModule }, { path: "/utf/runners/new", component: blueprintModule }, { path: "/utf/runners/:id", component: blueprintModule }, { path: "/utf/runners/:id/execute", component: blueprintModule },
  { path: "/redteam/implants/:id/beacon", component: blueprintModule }, { path: "/redteam/implants/:id/status", component: blueprintModule },
  { path: "/playbooks", component: blueprintModule }, { path: "/playbooks/new", component: blueprintModule }, { path: "/playbooks/:id/edit", component: blueprintModule }, { path: "/playbooks/:id/run", component: blueprintModule }, { path: "/playbooks/:id", component: blueprintModule },
  { path: "/evidence", component: blueprintModule }, { path: "/evidence/:id", component: blueprintModule },
  { path: "/reports", component: reports }, { path: "/reports/new", component: reports }, { path: "/reports/:id", component: reports },
  { path: "/workspaces", component: workspaces }, { path: "/workspaces/new", component: workspaces }, { path: "/workspaces/:id", component: workspaces }, { path: "/organizations", component: organizations }, { path: "/organizations/new", component: organizations }, { path: "/organizations/:id", component: organizations },
  { path: "/governance", component: governance }, { path: "/governance/approvals", component: governance }, { path: "/governance/policies", component: governance }, { path: "/findings", component: findings }, { path: "/findings/:id", component: findings }, { path: "/audit", component: audit },
  { path: "/operations", component: operations }, { path: "/operations/health", component: operations }, { path: "/operations/queue", component: operations }, { path: "/operations/workers", component: operations }, { path: "/operations-console", component: operationsAdmin }, { path: "/assurance", component: assurance }, { path: "/assurance/quality", component: assurance }, { path: "/assurance/compliance", component: assurance },
  { path: "/incidents", component: incidents }, { path: "/incidents/new", component: incidents }, { path: "/incidents/:id", component: incidents },
  { path: "/redteam", component: blueprintModule }, { path: "/redteam/operations", component: blueprintModule }, { path: "/redteam/operations/new", component: blueprintModule }, { path: "/redteam/implants", component: blueprintModule }, { path: "/redteam/phishing", component: blueprintModule },
  { path: "/purpleteam", component: blueprintModule }, { path: "/purpleteam/exercises", component: blueprintModule }, { path: "/purpleteam/exercises/new", component: blueprintModule },
  { path: "/bugbounty", component: blueprintModule }, { path: "/bugbounty/programs", component: blueprintModule }, { path: "/bugbounty/programs/new", component: blueprintModule }, { path: "/bugbounty/submissions", component: blueprintModule },
  { path: "/client/:orgSlug", component: clientPortal }, { path: "/client", component: clientPortal },
  { path: "/app/security", component: security }, { path: "/security", component: security }, { path: "/security/sessions", component: security }, { path: "/security/mfa", component: security }, { path: "/security/history", component: security }, { path: "/security/api-keys", component: security }, { path: "/notifications", component: notifications }, { path: "/notifications/settings", component: notifications },
  { path: "/profile", component: profile }, { path: "/settings", component: profile }, { path: "/settings/profile", component: profile }, { path: "/settings/team", component: profile }, { path: "/settings/policies", component: profile }, { path: "/settings/credentials", component: profile }, { path: "/settings/preferences", component: profile }, { path: "/settings/integrations", component: profile }, { path: "/settings/integrations/new", component: profile }, { path: "/settings/developer", component: profile }, { path: "/settings/developer/sdk", component: profile }, { path: "/settings/developer/keys", component: profile }, { path: "/settings/developer/logs", component: profile }, { path: "/settings/billing", component: profile }, { path: "/settings/billing/invoices", component: profile }, { path: "/settings/billing/payment", component: profile }, { path: "/settings/billing/upgrade", component: profile },
  { path: "/privacy", component: profile }, { path: "/privacy/export", component: profile }, { path: "/privacy/delete", component: profile }, { path: "/privacy/requests", component: profile }, { path: "/privacy/downloads", component: profile },
  { path: "/agents", component: blueprintModule }, { path: "/agents/new", component: blueprintModule }, { path: "/agents/:id", component: blueprintModule },
] as const;
