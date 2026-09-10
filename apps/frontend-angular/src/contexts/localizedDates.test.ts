import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const pagesWithTimestamps = ["Assurance.tsx", "Audit.tsx", "Governance.tsx", "Notifications.tsx", "Operations.tsx", "OperationsAdmin.tsx", "Workspaces.tsx"];

describe("localized dashboard timestamps", () => {
  it("does not allow browser-default timestamp formatting in authenticated page renderers", () => {
    pagesWithTimestamps.forEach(page => {
      const source = readFileSync(path.resolve(import.meta.dirname, `../pages/${page}`), "utf8");
      expect(source).not.toContain("toLocaleString()");
      expect(source).toContain("LocalizedDate");
    });
  });
});
