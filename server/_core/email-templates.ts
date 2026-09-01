function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
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
  const expiry = input.expiresAt ? `Undangan ini berlaku sampai ${input.expiresAt.toISOString()}.` : "Undangan ini memiliki masa berlaku terbatas.";
  const safeOrganization = escapeHtml(organizationName);
  const safeInviter = escapeHtml(inviterName);
  const safeUrl = escapeHtml(inviteUrl);

  return {
    subject: `Undangan bergabung ke ${organizationName} di AngelMind`,
    text: `${inviterName} mengundang Anda bergabung ke organisasi ${organizationName} di AngelMind.\n\nTerima undangan: ${inviteUrl}\n\n${expiry}`,
    html: `<p><strong>${safeInviter}</strong> mengundang Anda bergabung ke organisasi <strong>${safeOrganization}</strong> di AngelMind.</p><p><a href="${safeUrl}">Terima undangan</a></p><p>${escapeHtml(expiry)}</p>`,
  };
}
