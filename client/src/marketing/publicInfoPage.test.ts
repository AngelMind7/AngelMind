import { describe, expect, it } from "vitest";
import { publicInfoPageDefinitions } from "./PublicInfoPage";

describe("public information pages", () => {
  it("defines every registered informational route with meaningful content", () => {
    const expected = [
      "/pricing",
      "/demo",
      "/changelog",
      "/roadmap",
      "/status",
      "/contact",
      "/academy",
      "/privacy",
      "/terms",
      "/cookies",
      "/how-it-works",
      "/programs",
      "/researchers",
      "/blog",
      "/api-playground",
      "/acceptable-use",
      "/responsible-disclosure",
      "/data-processing",
    ];
    expect(Object.keys(publicInfoPageDefinitions).sort()).toEqual(expected.sort());
    for (const page of Object.values(publicInfoPageDefinitions)) {
      expect(page.eyebrow.length).toBeGreaterThan(2);
      expect(page.title.length).toBeGreaterThan(20);
      expect(page.description.length).toBeGreaterThan(40);
      expect(page.sections).toHaveLength(3);
    }
  });

  it("keeps public copy explicit about the execution boundary", () => {
    const combined = JSON.stringify(publicInfoPageDefinitions).toLowerCase();
    expect(combined).toContain("synthetic");
    expect(combined).toContain("human approval");
    expect(combined).toContain("autonomous submission");
    expect(combined).toContain("not available");
  });
});
