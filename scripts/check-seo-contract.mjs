import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const routes = read("client/src/publicRoutes.ts");
const sitemap = read("client/public/sitemap.xml");
const robots = read("client/public/robots.txt");
const index = read("client/index.html");
const publicPaths = [...routes.matchAll(/path:\s*["'`]([^"'`]+)["'`]/g)].map(match => match[1]).filter(path => !path.includes(":"));
const sitemapPaths = new Set([...sitemap.matchAll(/<loc>https:\/\/angelmind\.app([^<]*)<\/loc>/g)].map(match => match[1] || "/"));
const missing = publicPaths.filter(path => !sitemapPaths.has(path) && path !== "/trust-center");
const disallowedPublic = publicPaths.filter(path => new RegExp(`^Disallow: ${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m").test(robots));
if (missing.length) throw new Error(`Public routes missing from sitemap: ${missing.join(", ")}`);
if (disallowedPublic.length) throw new Error(`Public routes blocked by robots.txt: ${disallowedPublic.join(", ")}`);
for (const token of ["og:title", "og:description", "og:url", "twitter:card", "application/ld+json", "canonical"]) {
  if (!index.includes(token)) throw new Error(`index.html is missing SEO token: ${token}`);
}
console.log(`SEO contract OK: ${publicPaths.length} concrete public routes covered by sitemap and robots policy.`);
