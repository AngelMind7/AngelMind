import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("explicit localized workflow labels", () => {
  it("does not retain the former hardcoded Assurance severity or Signal Center event preference copy", () => {
    const pages = ["Assurance.tsx", "Notifications.tsx"].map(page => readFileSync(path.resolve(import.meta.dirname, `../pages/${page}`), "utf8"));
    const source = pages.join("\n");
    ["Low · 24h escalation", "Medium · 8h escalation", "Approval Tier 3", "Finding tervalidasi", "Pemeriksaan terjadwal"].forEach(legacy => expect(source).not.toContain(legacy));
    expect(source).toContain("notifications.approvalRequired");
    expect(source).toContain("assurance.severityLow");
  });
});
