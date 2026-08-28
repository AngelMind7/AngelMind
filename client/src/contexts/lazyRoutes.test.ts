import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("authenticated route loading", () => {
  it("keeps page imports lazy and renders them through a Suspense loading boundary", () => {
    const routeMap = readFileSync(path.resolve(import.meta.dirname, "../authenticatedRoutes.ts"), "utf8");
    const app = readFileSync(path.resolve(import.meta.dirname, "../App.tsx"), "utf8");
    expect(routeMap.match(/lazy\(\(\) => import/g)).toHaveLength(9);
    expect(app).toContain("<Suspense");
  });
});
