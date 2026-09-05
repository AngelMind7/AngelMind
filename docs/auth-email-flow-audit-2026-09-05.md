# Authentication and Email Flow Audit — 2026-09-05

## Scope

This audit follows the authentication and account-email paths from the client UI through Firebase Authentication, the server token-exchange route, account-security events, the email delivery ledger, the durable worker, and the SMTP adapter. It covers email registration, login, logout, password reset, verification email, verification resend, Google sign-in, MFA/device security, retry behavior, and provider configuration boundaries.

## Overall result

The authentication boundary is **fail-closed and mostly implemented**, but password-reset and account-verification email are currently **Firebase-direct flows, not AngelMind email-ledger flows**. The repository has a durable `emailDeliveries` ledger and `email.deliver` worker, but those are currently wired for organization invitations only. The reset and verification templates exist and are unit-tested, but no production runtime caller uses them.

This means the product can send reset/verification messages when Firebase is configured, but AngelMind does not persist those messages in its own delivery ledger, cannot expose their provider delivery state, does not retry them through its worker, and does not record a dedicated account-security event for a reset request or verification send.

The follow-up implementation added session-only pending-verification email state, a bounded 60-second resend/reset cooldown, password clearing after verification resend, and the same safeguards to the fallback dashboard authentication form. It also made the email worker retry ceiling explicit at five delivery attempts and marks terminal rows as failed so the worker does not send them again.

## Flow-by-flow findings

| Flow | Current implementation | Result |
|---|---|---|
| Email registration | `createUserWithEmailAndPassword` → Firebase `sendEmailVerification` → client signs out | Implemented at Firebase provider level |
| Email login | Firebase password sign-in → force-refresh ID token → `/api/auth/firebase` exchange | Implemented and fail-closed |
| Google login | Popup or mobile redirect → Firebase token exchange | Implemented and fail-closed |
| Email verification enforcement | Server rejects exchanged token unless `decoded.email_verified === true` | Implemented |
| Verification resend | Sign-in with email/password → Firebase `sendEmailVerification` → `finally` signs out | Implemented at Firebase provider level; not ledger-backed |
| Password reset | Firebase `sendPasswordResetEmail` directly from browser | Implemented at Firebase provider level; not ledger-backed |
| Logout | Firebase sign-out plus client auth state cleanup; server logout event path exists | Implemented |
| MFA | TOTP, recovery code, WebAuthn/passkey enrollment and verification routes exist | Implemented repository-side; live provider/browser verification remains operational evidence |
| Device security | Device registration/revocation and account-security event records exist | Implemented repository-side |
| SMTP delivery ledger | Durable queue, idempotency key, worker handler, retry timestamp, provider message ID | Implemented for callers that enqueue through `email-delivery.ts` |
| Reset/verification use of ledger | No runtime caller found | Missing |

## High-priority findings

### AUTH-EMAIL-001 — Reset and verification templates are orphaned from runtime

**Severity: High repository completeness gap.**

`server/_core/email-templates.ts` exports `buildPasswordResetEmail` and `buildAccountVerificationEmail`, and `server/email.test.ts` validates both templates. However, a runtime search found no non-test caller for either function. The only production caller of `enqueueEmailDelivery` is `server/organization.ts` for `organization_invitation`.

The consequence is that the server-side email ledger and templates do not govern password-reset or verification mail. Firebase sends those messages directly, so the application has no local record of request, delivery attempt, provider message ID, retry, or failure for those account flows.

**Recommended fix:** introduce a provider-neutral account-email service that creates idempotent `password_reset` and `account_verification` ledger rows, renders the existing templates, and enqueues `email.deliver`. If Firebase remains the chosen identity provider, decide explicitly whether Firebase-generated mail is acceptable as an external exception; otherwise use server-issued, short-lived, single-use action tokens and a verified callback/consume route. Do not create a second competing reset authority without a migration/security design.

### AUTH-EMAIL-002 — Password reset requests do not create an account-security event

`recordAuthEvent` supports `password_reset_requested`, but no caller was found for that event. The client displays a generic anti-enumeration message, which is good, but the security history cannot currently show that a reset was requested.

**Recommended fix:** record a redacted reset-request event keyed by a normalized/hashed recipient or Firebase UID when available. Never log the raw email, reset token, URL, or password. The event should be safe for both known and unknown addresses and should not reveal account existence through response timing or content.

### AUTH-EMAIL-003 — Registration cleanup had a failure-path bug (fixed in this audit)

`registerWithEmail` previously created the Firebase user, sent the verification email, and called `signOut` only after the send succeeded. If `sendEmailVerification` threw, the function exited before sign-out and left the newly created user signed in in the browser even though the UI reported an error. This audit changed the function to always sign out in a `finally` block.

`resendEmailVerification` correctly uses `finally` to sign out, and `signInWithEmail` signs out when server token exchange fails. Registration should use the same cleanup pattern.

**Follow-up:** add a client unit test with mocked Firebase auth methods proving cleanup occurs when the send call rejects.

## Medium-priority findings

### AUTH-EMAIL-004 — Verification resend requires the password again

The resend path signs in with `email + password` solely to obtain the Firebase user and send verification. This is provider-valid but creates friction and increases the chance of exposing credentials to a retry flow. The current UX offers resend only after a failed sign-in, so the password remains in component state. The follow-up now clears that password after every resend attempt and applies a bounded cooldown.

**Follow-up:** prefer a provider-supported signed-in verification continuation in a future identity-provider design. The current password re-entry path now clears the password immediately and has client-side cooldown/backoff.

### AUTH-EMAIL-005 — No explicit client-side verification-pending session state

Registration signs the user out and shows a notice. A session-only normalized email and bounded cooldown are now retained across reloads; passwords and tokens are never stored.

**Follow-up:** add a provider callback/deep-link state if the product later supports a dedicated verification landing page.

### AUTH-EMAIL-006 — Email delivery retry state is not guarded by a claim result

`executeEmailDeliveryJob` previously updated a queued/failed row to `sending`, but did not verify that exactly one row was claimed before sending. This audit added the same affected-row compare-and-set guard used by notification delivery, preventing a worker race from causing duplicate SMTP sends.

**Follow-up:** add a concurrent-claim regression test. If the database adapter cannot report affected rows safely, the new guard fails closed rather than sending.

### AUTH-EMAIL-007 — Retry scheduling was not visibly bounded by maximum attempts in the email service (fixed in this follow-up)

The email delivery path now uses an explicit five-attempt ceiling, passes that ceiling to the durable job, and marks the row terminally failed when the ceiling is reached. The existing schema keeps `nextAttemptAt` non-nullable, so terminal status—not a nullable timestamp—is the no-more-send signal.

**Follow-up:** add a persistence-level regression test proving that a terminal row cannot be sent again.

## Positive controls verified

- Firebase client configuration is disabled when required public config is incomplete.
- Firebase token exchange rejects unsupported providers.
- Firebase token exchange rejects tokens where `email_verified !== true`.
- Server error responses do not return the decoded token or provider details.
- Registration and reset UI use generic reset messaging that does not confirm whether an email exists.
- HTML email templates escape untrusted names and URLs.
- SMTP secrets are loaded from typed environment configuration and redacted in verification logs.
- Email queue rows have idempotency keys and persisted provider message IDs.
- Account security includes login, logout, MFA, token rejection, and device events; the reset-request event type still exists but is currently unused.
- MFA includes TOTP, recovery code, and WebAuthn/passkey paths with server-side verification.

## Validation performed

The following checks were used as the audit baseline:

- TypeScript check passed in the preceding repository validation.
- `server/email.test.ts` covers password-reset and account-verification template rendering, localization fallback, escaping, and links.
- `server/firebase.test.ts` covers disabled Firebase configuration behavior.
- `server/security.test.ts` covers request security headers and readiness behavior.
- Runtime symbol search confirmed the reset/verification templates are not called outside tests.
- Worker search confirmed `email.deliver` is registered and dispatches to `executeEmailDeliveryJob`.

## Final classification

Authentication itself is **implemented and fail-closed**. Firebase-managed reset and verification delivery is **provider-functional but not integrated with AngelMind’s durable email/audit workflow**. The audits fixed registration session cleanup, pending verification UX, resend/reset cooldown, email claim race protection, and bounded terminal retry behavior. Remaining priorities are the reset-request audit event, persistence-level concurrency/terminal tests, and an explicit architectural decision about whether reset/verification mail should remain Firebase-owned or move into the AngelMind delivery ledger.
