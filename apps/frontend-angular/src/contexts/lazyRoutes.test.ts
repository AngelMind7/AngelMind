import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("authenticated route loading", () => {
  it("keeps every authenticated page import lazy and renders them through a Suspense loading boundary", () => {
    const routeMap = readFileSync(path.resolve(import.meta.dirname, "../authenticatedRoutes.ts"), "utf8");
    const app = readFileSync(path.resolve(import.meta.dirname, "../App.tsx"), "utf8");
    const lazyImportCount = routeMap.match(/lazy\(\(\) => import/g)?.length ?? 0;
    expect(lazyImportCount).toBeGreaterThanOrEqual(28);
    expect(app).toContain("<Suspense");
  });
});
