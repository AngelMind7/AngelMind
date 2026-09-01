function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function expiryText(label: string, expiresAt?: Date) {
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
  const expiry = expiryText("Undangan ini", input.expiresAt);
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
}) {
  const recipientName = input.recipientName?.trim() || "Pengguna AngelMind";
  const resetUrl = input.resetUrl.trim();
  const expiry = expiryText("Tautan reset password ini", input.expiresAt);
  const safeName = escapeHtml(recipientName);
  const safeUrl = escapeHtml(resetUrl);

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
}) {
  const recipientName = input.recipientName?.trim() || "Pengguna baru AngelMind";
  const verificationUrl = input.verificationUrl.trim();
  const expiry = expiryText("Tautan verifikasi ini", input.expiresAt);
  const safeName = escapeHtml(recipientName);
  const safeUrl = escapeHtml(verificationUrl);

  return {
    subject: "Verifikasi akun AngelMind Anda",
    text: `Halo ${recipientName},\n\nTerima kasih telah membuat akun AngelMind. Verifikasi alamat email Anda melalui tautan berikut:\n${verificationUrl}\n\n${expiry}\nJika Anda tidak membuat akun ini, abaikan email ini.`,
    html: `<p>Halo <strong>${safeName}</strong>,</p><p>Terima kasih telah membuat akun AngelMind. Verifikasi alamat email Anda dengan tombol berikut:</p><p><a href="${safeUrl}">Verifikasi akun</a></p><p>${escapeHtml(expiry)}</p><p>Jika Anda tidak membuat akun ini, abaikan email ini.</p>`,
  };
}
