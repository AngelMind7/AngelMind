import { describe, expect, it } from "vitest";
import { buildAccountVerificationEmail, buildOrganizationInvitationEmail, buildPasswordResetEmail } from "./_core/email-templates";

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

describe("password reset email template", () => {
  it("includes reset instructions, expiry, and escaped recipient data", () => {
    const result = buildPasswordResetEmail({
      recipientName: "Dewi <Admin>",
      resetUrl: "https://angelmind.test/reset?token=a&next=/login",
      expiresAt: new Date("2026-09-01T10:00:00.000Z"),
    });

    expect(result.subject).toBe("Reset password AngelMind");
    expect(result.text).toContain("2026-09-01T10:00:00.000Z");
    expect(result.text).toContain("Jika Anda tidak meminta reset password");
    expect(result.html).toContain("Dewi &lt;Admin&gt;");
    expect(result.html).toContain("reset?token=a&amp;next=/login");
  });
});

describe("account verification email template", () => {
  it("provides both plain text and HTML verification content", () => {
    const result = buildAccountVerificationEmail({
      recipientName: "Budi",
      verificationUrl: "https://angelmind.test/verify?token=xyz",
    });

    expect(result.subject).toBe("Verifikasi akun AngelMind Anda");
    expect(result.text).toContain("Terima kasih telah membuat akun AngelMind");
    expect(result.text).toContain("https://angelmind.test/verify?token=xyz");
    expect(result.html).toContain("Verifikasi akun");
    expect(result.html).toContain("https://angelmind.test/verify?token=xyz");
  });
});
