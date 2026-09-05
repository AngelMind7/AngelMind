import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./static";
import { workspaceMaintenanceHandler } from "../control-plane/scheduled";
import { registerHealthRoutes, registerMetricsRoute, registerSecurityMiddleware } from "../security";
import { registerFirebaseAuthRoutes } from "../firebase-auth";
import { validateRuntimeConfig } from "./env";
import { registerRestV1Routes } from "../rest-v1";
import { registerRestV1CoreResourceRoutes } from "../rest-v1-core-resources";
import { registerRestV1TagsNotesRoutes } from "../rest-v1-tags-notes";
import { registerRestV1EvidenceFindingRoutes } from "../rest-v1-evidence-findings";
import { registerToolRestV1Routes } from "../rest-v1-tools";
import { registerRealtimeRoutes } from "../realtime";
import { registerRealtimeWebSocket } from "../realtime-websocket";
import { registerApiRateLimit } from "../rate-limit";
import { registerSimulationRoutes } from "../simulation-rest";
import { registerRedTeamRestV1Routes } from "../rest-v1-redteam";
import { registerPurpleTeamRestV1Routes } from "../rest-v1-purple-team";
import { registerBugBountyRestV1Routes } from "../rest-v1-bug-bounty";
import { registerRestV1ReportingRoutes } from "../rest-v1-reporting";
import { registerThreatIntelligenceRestV1Routes } from "../rest-v1-threat-intelligence";
import { registerAiAutomationRestV1Routes } from "../rest-v1-ai-automation";
import { registerGovernanceRestV1Routes } from "../rest-v1-governance";
import { registerBreakGlassRestV1Routes } from "../rest-v1-breakglass";

function isPortAvailable(port: number): Promise<boolean> { return new Promise(resolve => { const server = net.createServer(); server.listen(port, () => server.close(() => resolve(true))); server.on("error", () => resolve(false)); }); }
async function findAvailablePort(startPort = 3000): Promise<number> { for (let port = startPort; port < startPort + 20; port++) if (await isPortAvailable(port)) return port; throw new Error(`No available port found starting from ${startPort}`); }
async function startServer() {
  validateRuntimeConfig(); const app = express(); const server = createServer(app); registerSecurityMiddleware(app); registerApiRateLimit(app); registerHealthRoutes(app); registerMetricsRoute(app); app.use(express.json({ limit: "8mb" })); app.use(express.urlencoded({ limit: "1mb", extended: true })); registerFirebaseAuthRoutes(app); registerRestV1Routes(app); registerRestV1CoreResourceRoutes(app); registerRestV1TagsNotesRoutes(app); registerRestV1EvidenceFindingRoutes(app); registerToolRestV1Routes(app); registerSimulationRoutes(app); registerRedTeamRestV1Routes(app); registerPurpleTeamRestV1Routes(app); registerBugBountyRestV1Routes(app); registerRestV1ReportingRoutes(app); registerThreatIntelligenceRestV1Routes(app); registerAiAutomationRestV1Routes(app); registerGovernanceRestV1Routes(app); registerBreakGlassRestV1Routes(app); registerRealtimeRoutes(app); registerRealtimeWebSocket(server); app.post("/api/scheduled/workspace-maintenance", workspaceMaintenanceHandler); app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  if (process.env.NODE_ENV === "development") { const { setupVite } = await import("./vite"); await setupVite(app, server); } else serveStatic(app);
  const preferredPort = parseInt(process.env.PORT || "3000", 10); if (!Number.isInteger(preferredPort) || preferredPort < 1 || preferredPort > 65535) throw new Error(`Invalid PORT value: ${process.env.PORT ?? ""}`); const port = process.env.NODE_ENV === "production" ? preferredPort : await findAvailablePort(preferredPort); if (port !== preferredPort) console.log(`Port ${preferredPort} is busy, using port ${port}`); server.listen(port, () => console.log(`Server running on http://localhost:${port}/`)); if (process.env.RUN_WORKER === "true") { await import("../worker.js"); console.info("[startup] in-process worker loop enabled (RUN_WORKER=true)"); }
}
startServer().catch(console.error);
