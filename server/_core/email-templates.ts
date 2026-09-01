function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export type EmailLocale = "id" | "en";

function resolveLocale(locale?: string): EmailLocale {
  return locale?.toLowerCase().startsWith("en") ? "en" : "id";
}

function expiryText(locale: EmailLocale, label: string, expiresAt?: Date) {
  if (locale === "en") return expiresAt ? `${label} expires on ${expiresAt.toISOString()}.` : `${label} has a limited validity period.`;
  return expiresAt ? `${label} berlaku sampai ${expiresAt.toISOString()}.` : `${label} memiliki masa berlaku terbatas.`;
}

export function buildOrganizationInvitationEmail(input: {
  organizationName: string;
  inviterName?: string;
  inviteUrl: string;
  expiresAt?: Date;
}) {
  const organizationName = input.organizationName.trim();
  const inviterName = input.inviterName?.trim() || "Seseorang di AngelMind";
  const inviteUrl = input.inviteUrl.trim();
  const expiry = expiryText("id", "Undangan ini", input.expiresAt);
  const safeOrganization = escapeHtml(organizationName);
  const safeInviter = escapeHtml(inviterName);
  const safeUrl = escapeHtml(inviteUrl);

  return {
    subject: `Undangan bergabung ke ${organizationName} di AngelMind`,
    text: `${inviterName} mengundang Anda bergabung ke organisasi ${organizationName} di AngelMind.\n\nTerima undangan: ${inviteUrl}\n\n${expiry}`,
    html: `<p><strong>${safeInviter}</strong> mengundang Anda bergabung ke organisasi <strong>${safeOrganization}</strong> di AngelMind.</p><p><a href="${safeUrl}">Terima undangan</a></p><p>${escapeHtml(expiry)}</p>`,
  };
}

export function buildPasswordResetEmail(input: {
  recipientName?: string;
  resetUrl: string;
  expiresAt?: Date;
  locale?: string;
}) {
  const locale = resolveLocale(input.locale);
  const recipientName = input.recipientName?.trim() || (locale === "en" ? "AngelMind user" : "Pengguna AngelMind");
  const resetUrl = input.resetUrl.trim();
  const expiry = expiryText(locale, locale === "en" ? "This password reset link" : "Tautan reset password ini", input.expiresAt);
  const safeName = escapeHtml(recipientName);
  const safeUrl = escapeHtml(resetUrl);

  if (locale === "en") {
    return {
      subject: "Reset your AngelMind password",
      text: `Hello ${recipientName},\n\nWe received a request to reset your AngelMind password. If you made this request, open the link below:\n${resetUrl}\n\n${expiry}\nIf you did not request a password reset, you can ignore this email.`,
      html: `<p>Hello <strong>${safeName}</strong>,</p><p>We received a request to reset your AngelMind password. If you made this request, use the button below:</p><p><a href="${safeUrl}">Reset password</a></p><p>${escapeHtml(expiry)}</p><p>If you did not request a password reset, you can ignore this email.</p>`,
    };
  }

  return {
    subject: "Reset password AngelMind",
    text: `Halo ${recipientName},\n\nKami menerima permintaan untuk mereset password akun AngelMind Anda. Jika Anda yang memintanya, buka tautan berikut:\n${resetUrl}\n\n${expiry}\nJika Anda tidak meminta reset password, abaikan email ini.`,
    html: `<p>Halo <strong>${safeName}</strong>,</p><p>Kami menerima permintaan untuk mereset password akun AngelMind Anda. Jika Anda yang memintanya, gunakan tombol berikut:</p><p><a href="${safeUrl}">Reset password</a></p><p>${escapeHtml(expiry)}</p><p>Jika Anda tidak meminta reset password, abaikan email ini.</p>`,
  };
}

export function buildAccountVerificationEmail(input: {
  recipientName?: string;
  verificationUrl: string;
  expiresAt?: Date;
  locale?: string;
}) {
  const locale = resolveLocale(input.locale);
  const recipientName = input.recipientName?.trim() || (locale === "en" ? "new AngelMind user" : "Pengguna baru AngelMind");
  const verificationUrl = input.verificationUrl.trim();
  const expiry = expiryText(locale, locale === "en" ? "This verification link" : "Tautan verifikasi ini", input.expiresAt);
  const safeName = escapeHtml(recipientName);
  const safeUrl = escapeHtml(verificationUrl);

  if (locale === "en") {
    return {
      subject: "Verify your AngelMind account",
      text: `Hello ${recipientName},\n\nThank you for creating an AngelMind account. Verify your email address using the link below:\n${verificationUrl}\n\n${expiry}\nIf you did not create this account, you can ignore this email.`,
      html: `<p>Hello <strong>${safeName}</strong>,</p><p>Thank you for creating an AngelMind account. Verify your email address using the button below:</p><p><a href="${safeUrl}">Verify account</a></p><p>${escapeHtml(expiry)}</p><p>If you did not create this account, you can ignore this email.</p>`,
    };
  }

  return {
    subject: "Verifikasi akun AngelMind Anda",
    text: `Halo ${recipientName},\n\nTerima kasih telah membuat akun AngelMind. Verifikasi alamat email Anda melalui tautan berikut:\n${verificationUrl}\n\n${expiry}\nJika Anda tidak membuat akun ini, abaikan email ini.`,
    html: `<p>Halo <strong>${safeName}</strong>,</p><p>Terima kasih telah membuat akun AngelMind. Verifikasi alamat email Anda dengan tombol berikut:</p><p><a href="${safeUrl}">Verifikasi akun</a></p><p>${escapeHtml(expiry)}</p><p>Jika Anda tidak membuat akun ini, abaikan email ini.</p>`,
  };
}
