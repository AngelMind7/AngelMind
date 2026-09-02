import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import { mfaChallenges, mfaFactors, mfaRecoveryCodes } from "../drizzle/schema";
import { getDb } from "./db";
import { recordAuthEvent } from "./account-security";

const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const CHALLENGE_TTL_MS = 5 * 60_000;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

type JsonRecord = Record<string, unknown>;

function encryptionKey() {
  const configured = process.env.MFA_ENCRYPTION_KEY;
  if (!configured) throw new Error("MFA_ENCRYPTION_KEY is required before enrolling MFA.");
  return createHash("sha256").update(configured).digest();
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map(part => part.toString("base64url")).join(".");
}

function decrypt(value: string) {
  const [iv, tag, ciphertext] = value.split(".").map(part => Buffer.from(part, "base64url"));
  if (!iv || !tag || !ciphertext) throw new Error("Stored MFA secret is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function generateTotpSecret() {
  return randomBytes(20).toString("base64").replace(/=+$/g, "").replace(/\+/g, "").replace(/\//g, "");
}

function base32Decode(value: string) {
  const normalized = value.toUpperCase().replace(/=+$/g, "");
  let bits = "";
  for (const char of normalized) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error("Invalid TOTP secret.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

function base32Encode(value: Buffer) {
  let bits = "";
  for (const byte of Array.from(value)) bits += byte.toString(2).padStart(8, "0");
  let result = "";
  for (let index = 0; index < bits.length; index += 5) result += BASE32[Number.parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)];
  return result;
}

export function generateTotpCode(secret: string, timestampMs = Date.now()) {
  const counter = Math.floor(timestampMs / 1000 / TOTP_STEP_SECONDS);
  const key = base32Decode(secret);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac("sha1", key).update(message).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const value = ((mac[offset] & 0x7f) << 24) | ((mac[offset + 1] & 0xff) << 16) | ((mac[offset + 2] & 0xff) << 8) | (mac[offset + 3] & 0xff);
  return String(value % 1_000_000).padStart(TOTP_DIGITS, "0");
}

export function verifyTotpCode(secret: string, code: string, timestampMs = Date.now()) {
  if (!/^\\d{6}$/.test(code)) return false;
  for (const drift of [-1, 0, 1]) {
    const expected = generateTotpCode(secret, timestampMs + drift * TOTP_STEP_SECONDS * 1000);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(code))) return true;
  }
  return false;
}

function hashCode(code: string) { return createHash("sha256").update(code).digest("hex"); }
function normalizeLabel(label: string | undefined) { return (label?.trim() || "Authenticator").slice(0, 120); }

export function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => `${randomBytes(4).toString("hex")}-${randomBytes(4).toString("hex")}`);
}

function rpId() { return process.env.WEBAUTHN_RP_ID || new URL(process.env.APP_ORIGIN || "http://localhost:3000").hostname; }
function origin() { return process.env.WEBAUTHN_ORIGIN || process.env.APP_ORIGIN || "http://localhost:3000"; }

async function createChallenge(userId: number, type: "totp" | "registration" | "authentication", challenge: string, metadata: JsonRecord = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await db.insert(mfaChallenges).values({ userId, type, challenge, metadata: JSON.stringify(metadata), expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) });
}

async function consumeChallenge(userId: number, type: "totp" | "registration" | "authentication", challenge: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const [row] = await db.select().from(mfaChallenges).where(and(eq(mfaChallenges.userId, userId), eq(mfaChallenges.type, type), eq(mfaChallenges.challenge, challenge), gt(mfaChallenges.expiresAt, new Date()), isNull(mfaChallenges.consumedAt))).limit(1);
  if (!row) throw new Error("MFA challenge is missing, expired, or already consumed.");
  await db.update(mfaChallenges).set({ consumedAt: new Date() }).where(and(eq(mfaChallenges.id, row.id), isNull(mfaChallenges.consumedAt)));
  return row;
}

export async function getMfaStatus(userId: number) {
  const db = await getDb();
  if (!db) return { enabled: false, factors: [], recoveryCodesRemaining: 0, databaseAvailable: false as const };
  const [factors, codes] = await Promise.all([
    db.select({ id: mfaFactors.id, type: mfaFactors.type, label: mfaFactors.label, enabled: mfaFactors.enabled, lastUsedAt: mfaFactors.lastUsedAt, createdAt: mfaFactors.createdAt }).from(mfaFactors).where(and(eq(mfaFactors.userId, userId), eq(mfaFactors.enabled, 1))).orderBy(desc(mfaFactors.createdAt)),
    db.select({ id: mfaRecoveryCodes.id }).from(mfaRecoveryCodes).where(and(eq(mfaRecoveryCodes.userId, userId), isNull(mfaRecoveryCodes.usedAt))),
  ]);
  return { enabled: factors.length > 0, factors, recoveryCodesRemaining: codes.length, databaseAvailable: true as const };
}

export async function beginTotpEnrollment(userId: number, label?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const secret = base32Encode(randomBytes(20));
  const challenge = randomBytes(32).toString("base64url");
  await createChallenge(userId, "totp", challenge, { secret: encrypt(secret), label: normalizeLabel(label) });
  const account = `AngelMind:${userId}`;
  return { challenge, secret, otpauthUrl: `otpauth://totp/${encodeURIComponent(account)}?secret=${secret}&issuer=AngelMind&algorithm=SHA1&digits=6&period=30` };
}

export async function confirmTotpEnrollment(userId: number, input: { challenge: string; code: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const challenge = await consumeChallenge(userId, "totp", input.challenge);
  const metadata = JSON.parse(challenge.metadata) as { secret: string; label: string };
  if (!verifyTotpCode(decrypt(metadata.secret), input.code)) throw new Error("Invalid authenticator code.");
  await db.insert(mfaFactors).values({ userId, type: "totp", label: metadata.label, secretCiphertext: metadata.secret, enabled: 1 });
  const recoveryCodes = generateRecoveryCodes();
  for (const code of recoveryCodes) await db.insert(mfaRecoveryCodes).values({ userId, codeHash: hashCode(code) });
  await recordAuthEvent(userId, "mfa_enrolled", { type: "totp" });
  return { enabled: true as const, recoveryCodes };
}

export async function verifyTotpOrRecoveryCode(userId: number, code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const factors = await db.select().from(mfaFactors).where(and(eq(mfaFactors.userId, userId), eq(mfaFactors.type, "totp"), eq(mfaFactors.enabled, 1))).limit(10);
  if (factors.some(factor => factor.secretCiphertext && verifyTotpCode(decrypt(factor.secretCiphertext), code))) {
    await recordAuthEvent(userId, "mfa_enrolled", { type: "totp_verified" });
    return { verified: true as const, method: "totp" as const };
  }
  const [recovery] = await db.select().from(mfaRecoveryCodes).where(and(eq(mfaRecoveryCodes.userId, userId), eq(mfaRecoveryCodes.codeHash, hashCode(code)), isNull(mfaRecoveryCodes.usedAt))).limit(1);
  if (!recovery) throw new Error("Invalid MFA code.");
  await db.update(mfaRecoveryCodes).set({ usedAt: new Date() }).where(and(eq(mfaRecoveryCodes.id, recovery.id), isNull(mfaRecoveryCodes.usedAt)));
  return { verified: true as const, method: "recovery" as const };
}

export async function beginPasskeyRegistration(userId: number, label?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const existing = await db.select({ credentialId: mfaFactors.credentialId }).from(mfaFactors).where(and(eq(mfaFactors.userId, userId), eq(mfaFactors.type, "webauthn"), eq(mfaFactors.enabled, 1)));
  const options = await generateRegistrationOptions({ rpName: "AngelMind", rpID: rpId(), userName: `user-${userId}`, userDisplayName: `AngelMind user ${userId}`, userID: Buffer.from(String(userId)), attestationType: "none", excludeCredentials: existing.filter(row => row.credentialId).map(row => ({ id: row.credentialId! })), authenticatorSelection: { residentKey: "preferred", userVerification: "required" } });
  await createChallenge(userId, "registration", options.challenge, { label: normalizeLabel(label) });
  return options;
}

export async function finishPasskeyRegistration(userId: number, challenge: string, response: JsonRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const row = await consumeChallenge(userId, "registration", challenge);
  const metadata = JSON.parse(row.metadata) as { label: string };
  const verification = await verifyRegistrationResponse({ response: response as never, expectedChallenge: challenge, expectedOrigin: origin(), expectedRPID: rpId() });
  if (!verification.verified || !verification.registrationInfo) throw new Error("Passkey registration could not be verified.");
  const info = verification.registrationInfo;
  const credential = info.credential;
  await db.insert(mfaFactors).values({ userId, type: "webauthn", label: metadata.label, credentialId: credential.id, publicKey: Buffer.from(credential.publicKey).toString("base64url"), counter: credential.counter, transports: JSON.stringify(credential.transports ?? []), enabled: 1 });
  await recordAuthEvent(userId, "mfa_enrolled", { type: "webauthn" });
  return { verified: true as const };
}

export async function beginPasskeyAuthentication(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  const credentials = await db.select({ credentialId: mfaFactors.credentialId, transports: mfaFactors.transports }).from(mfaFactors).where(and(eq(mfaFactors.userId, userId), eq(mfaFactors.type, "webauthn"), eq(mfaFactors.enabled, 1)));
  const options = await generateAuthenticationOptions({ rpID: rpId(), userVerification: "required", allowCredentials: credentials.filter(row => row.credentialId).map(row => ({ id: row.credentialId!, transports: row.transports ? JSON.parse(row.transports) : undefined })) });
  await createChallenge(userId, "authentication", options.challenge);
  return options;
}

export async function finishPasskeyAuthentication(userId: number, challenge: string, response: JsonRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia.");
  await consumeChallenge(userId, "authentication", challenge);
  const credentialId = typeof response.id === "string" ? response.id : "";
  const [factor] = await db.select().from(mfaFactors).where(and(eq(mfaFactors.userId, userId), eq(mfaFactors.type, "webauthn"), eq(mfaFactors.credentialId, credentialId), eq(mfaFactors.enabled, 1))).limit(1);
  if (!factor?.publicKey) throw new Error("Passkey is not registered for this account.");
  const verification = await verifyAuthenticationResponse({ response: response as never, expectedChallenge: challenge, expectedOrigin: origin(), expectedRPID: rpId(), credential: { id: factor.credentialId!, publicKey: Buffer.from(factor.publicKey, "base64url"), counter: factor.counter, transports: factor.transports ? JSON.parse(factor.transports) : undefined } });
  if (!verification.verified) throw new Error("Passkey assertion could not be verified.");
  await db.update(mfaFactors).set({ counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() }).where(eq(mfaFactors.id, factor.id));
  return { verified: true as const, method: "webauthn" as const };
}
