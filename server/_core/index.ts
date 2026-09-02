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
import { registerRealtimeRoutes } from "../realtime";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  validateRuntimeConfig();
  const app = express();
  const server = createServer(app);
  registerSecurityMiddleware(app);
  registerHealthRoutes(app);
  registerMetricsRoute(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "8mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  registerFirebaseAuthRoutes(app);
  registerRestV1Routes(app);
  registerRealtimeRoutes(app);
  app.post("/api/scheduled/workspace-maintenance", workspaceMaintenanceHandler);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Free/single-service Railway plan: tidak ada service Worker terpisah.
  // Set RUN_WORKER=true di service ini supaya worker loop ikut jalan in-process.
  if (process.env.RUN_WORKER === "true") {
    await import("../worker.js");
    console.info("[startup] in-process worker loop enabled (RUN_WORKER=true)");
  }
}

startServer().catch(console.error);
