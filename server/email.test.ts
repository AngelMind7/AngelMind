import { describe, expect, it } from "vitest";
import { buildOrganizationInvitationEmail } from "./_core/email-templates";

describe("organization invitation email template", () => {
  it("escapes untrusted values in HTML while preserving the link in text", () => {
    const result = buildOrganizationInvitationEmail({
      organizationName: "A < B",
      inviterName: "Rina & Dimas",
      inviteUrl: "https://angelmind.test/invite?token=abc&next=home",
    });

    expect(result.subject).toContain("A < B");
    expect(result.text).toContain("https://angelmind.test/invite?token=abc&next=home");
    expect(result.html).toContain("A &lt; B");
    expect(result.html).toContain("Rina &amp; Dimas");
    expect(result.html).not.toContain("A < B");
  });
});
