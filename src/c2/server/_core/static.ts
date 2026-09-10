import fs from "fs";
import express, { type Express } from "express";
import path from "path";

export function serveStatic(app: Express) {
  // esbuild emits the server entrypoint under dist/_core while Vite emits
  // the browser bundle under dist/public.
  const distPath = path.resolve(import.meta.dirname, "../public");
  if (!fs.existsSync(distPath)) {
    console.error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
  }

  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
