import { readFileSync } from "node:fs";

const publicRoutes = readFileSync("client/src/publicRoutes.ts", "utf8");
const authenticatedRoutes = readFileSync("client/src/authenticatedRoutes.ts", "utf8");
const app = readFileSync("client/src/App.tsx", "utf8");

const routePaths = source => [...source.matchAll(/path:\s*["'`]([^"'`]+)["'`]/g)].map(m => m[1]);
const publicPaths = routePaths(publicRoutes);
const authenticatedPaths = routePaths(authenticatedRoutes);
const allPaths = [...new Set([...publicPaths, ...authenticatedPaths])];

const requiredPublic = [
  "/", "/product", "/features", "/how-it-works", "/bug-bounty", "/for-researchers",
  "/trust-center", "/docs", "/blog", "/api-playground", "/security", "/pricing",
  "/changelog", "/roadmap", "/status", "/contact", "/academy", "/legal/privacy",
  "/legal/terms", "/legal/cookies", "/legal/acceptable-use",
  "/legal/responsible-disclosure", "/legal/data-processing"
];
const requiredAuth = [
  "/dashboard", "/mission-control", "/coverage", "/research", "/research/new",
  "/knowledge", "/search", "/collaboration", "/saved-views", "/tags-notes", "/assets",
  "/tools", "/reports", "/workspaces", "/organizations", "/governance", "/findings",
  "/audit", "/operations", "/assurance", "/incidents", "/security", "/notifications",
  "/settings", "/redteam", "/purpleteam", "/bugbounty", "/client/:orgSlug"
];

const missing = paths => paths.filter(path => !allPaths.includes(path));
const duplicatePaths = allPaths.filter((path, index) => allPaths.indexOf(path) !== index);
const statusStates = ["Loading", "Success", "Empty", "Error", "Unauthorized", "Offline"];
const statusSource = `${app}\n${readFileSync("client/src/index.css", "utf8")}`;
const missingStatusSignals = statusStates.filter(state => !new RegExp(state, "i").test(statusSource));

if (allPaths.length < 100) throw new Error(`Web page contract requires 100+ routed pages; found ${allPaths.length}.`);
if (missing(requiredPublic).length) throw new Error(`Missing required public routes: ${missing(requiredPublic).join(", ")}`);
if (missing(requiredAuth).length) throw new Error(`Missing required authenticated routes: ${missing(requiredAuth).join(", ")}`);
if (duplicatePaths.length) throw new Error(`Duplicate route paths: ${[...new Set(duplicatePaths)].join(", ")}`);
if (missingStatusSignals.length) throw new Error(`Missing required page-state signals: ${missingStatusSignals.join(", ")}`);
if (!app.includes("ErrorBoundary") || !app.includes("OfflineStatus")) throw new Error("Global error/offline UX wiring is missing.");

console.log(`Web page contract OK: ${allPaths.length} unique routes (${publicPaths.length} public/auth entry routes combined with ${authenticatedPaths.length} authenticated entries).`);
console.log("Required public/authenticated route families: PASS");
console.log("Required page states (Loading, Success, Empty, Error, Unauthorized, Offline): PASS");
console.log("Global ErrorBoundary + OfflineStatus: PASS");
