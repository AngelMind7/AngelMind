import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(root, "docs/application-menu.md"), "utf8");
const routes = readFileSync(resolve(root, "client/src/authenticatedRoutes.ts"), "utf8");
const menuItems = ["Dashboard","Mission Control","Coverage","Research","AI Center","Knowledge","Global Search","Collaboration","Saved Views","Tags & Notes","Assets","Tools","Reports","Workspaces","Organizations","Governance","Findings","Audit Log","Operations","Assurance","Incidents","Security","Notifications","Settings & Profile"];
const missing = menuItems.filter(item => !source.includes(item));
if (missing.length) { console.error(`Missing menu items: ${missing.join(", ")}`); process.exit(1); }
const requiredRoots = ["/dashboard","/mission-control","/coverage","/research","/ai","/knowledge","/search","/collaboration","/saved-views","/tags-notes","/assets","/tools","/reports","/workspaces","/organizations","/governance","/findings","/audit","/operations","/assurance","/incidents","/security","/notifications","/settings"];
const missingRoutes = requiredRoots.filter(route => !routes.includes(`path: "${route}"`));
if (missingRoutes.length) { console.error(`Missing menu routes: ${missingRoutes.join(", ")}`); process.exit(1); }
console.log(`Application menu OK: ${menuItems.length} menus mapped to authenticated routes.`);
