import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { publicRoutes } from "@/publicRoutes";

describe("public Trust Center", () => {
  it("is a route-isolated inventory of implemented boundaries without unverified certification or testimonial claims", () => {
    const source = readFileSync(path.resolve(import.meta.dirname, "TrustCenter.tsx"), "utf8");
    expect(publicRoutes.find(route => route.path === "/trust")?.boundary).toBe("implemented-control-inventory");
    expect(source).toContain("marketing.safety.title");
    expect(source).not.toMatch(/SOC ?2|ISO ?27001|testimonial|customer review|certification/i);
  });
});
