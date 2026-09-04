import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const publicRoutes = read("client/src/publicRoutes.ts");
const authenticatedRoutes = read("client/src/authenticatedRoutes.ts");
const app = read("client/src/App.tsx");
const pageState = read("client/src/components/PageState.tsx");

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
const requiredStates = ["loading", "success", "empty", "error", "unauthorized", "offline"];
const missingStates = requiredStates.filter(state => !pageState.includes(`"${state}"`));

if (allPaths.length < 100) throw new Error(`Web page contract requires 100+ routed pages; found ${allPaths.length}.`);
if (missing(requiredPublic).length) throw new Error(`Missing required public routes: ${missing(requiredPublic).join(", ")}`);
if (missing(requiredAuth).length) throw new Error(`Missing required authenticated routes: ${missing(requiredAuth).join(", ")}`);
if (missingStates.length) throw new Error(`Missing required page states: ${missingStates.join(", ")}`);
if (!app.includes("ErrorBoundary") || !app.includes("OfflineStatus")) throw new Error("Global error/offline UX wiring is missing.");

console.log(`Web page contract OK: ${allPaths.length} unique routed pages.`);
console.log("Required public/authenticated route families: PASS");
console.log("Required page states (Loading, Success, Empty, Error, Unauthorized, Offline): PASS");
console.log("Global ErrorBoundary + OfflineStatus: PASS");
