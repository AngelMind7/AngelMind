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

describe("localized password reset email template", () => {
  it("keeps Indonesian as the backwards-compatible default", () => {
    const result = buildPasswordResetEmail({ recipientName: "Dewi", resetUrl: "https://angelmind.test/reset" });
    expect(result.subject).toBe("Reset password AngelMind");
    expect(result.text).toContain("Kami menerima permintaan");
    expect(result.html).toContain("Reset password");
  });

  it("falls back to Indonesian for an unknown locale", () => {
    const result = buildPasswordResetEmail({
      recipientName: "Dewi",
      resetUrl: "https://angelmind.test/reset",
      locale: "xx-YY",
    });

    expect(result.subject).toBe("Reset password AngelMind");
    expect(result.text).toContain("Kami menerima permintaan");
    expect(result.text).not.toContain("We received a request");
  });

  it("renders English and regional English locales", () => {
    const result = buildPasswordResetEmail({
      recipientName: "Dewi <Admin>",
      resetUrl: "https://angelmind.test/reset?token=a&next=/login",
      expiresAt: new Date("2026-09-01T10:00:00.000Z"),
      locale: "en-US",
    });

    expect(result.subject).toBe("Reset your AngelMind password");
    expect(result.text).toContain("We received a request");
    expect(result.text).toContain("2026-09-01T10:00:00.000Z");
    expect(result.html).toContain("Dewi &lt;Admin&gt;");
    expect(result.html).toContain("reset?token=a&amp;next=/login");
  });
});

describe("localized account verification email template", () => {
  it("renders English verification content", () => {
    const result = buildAccountVerificationEmail({
      recipientName: "Budi",
      verificationUrl: "https://angelmind.test/verify?token=xyz",
      locale: "en",
    });

    expect(result.subject).toBe("Verify your AngelMind account");
    expect(result.text).toContain("Thank you for creating an AngelMind account");
    expect(result.html).toContain("Verify account");
    expect(result.html).toContain("https://angelmind.test/verify?token=xyz");
  });

  it("falls back to Indonesian for unsupported locales", () => {
    const result = buildAccountVerificationEmail({
      verificationUrl: "https://angelmind.test/verify",
      locale: "fr",
    });

    expect(result.subject).toBe("Verifikasi akun AngelMind Anda");
    expect(result.text).toContain("Terima kasih telah membuat akun AngelMind");
  });
});
