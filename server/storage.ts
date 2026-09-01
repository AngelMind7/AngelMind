// Server-side Supabase Storage helpers.
// The service-role key must stay on the server and must never be exposed as VITE_*.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SIGNED_URL_TTL_SECONDS = 60 * 60;
const MAX_SIGNED_URL_TTL_SECONDS = 60 * 60;

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();

  if (!url || !serviceRoleKey || !bucket) {
    throw new Error(
      "Storage config missing: set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET",
    );
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("SUPABASE_URL must be a valid HTTPS URL.");
  }
  if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname.endsWith(".supabase.co")) {
    throw new Error("SUPABASE_URL must use an approved HTTPS Supabase host.");
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,62}$/.test(bucket)) {
    throw new Error("SUPABASE_STORAGE_BUCKET contains invalid characters.");
  }

  return { url: parsedUrl.toString().replace(/\/$/, ""), serviceRoleKey, bucket };
}

function getSupabaseStorage(): { client: SupabaseClient; bucket: string } {
  const { url, serviceRoleKey, bucket } = getSupabaseConfig();
  return {
    client: createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
    bucket,
  };
}

export function normalizeStorageKey(relKey: string): string {
  const normalized = relKey.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("\0")) throw new Error("Storage object key is invalid.");
  const segments = normalized.split("/");
  if (segments.some(segment => !segment || segment === "." || segment === "..")) {
    throw new Error("Storage object key must remain within its assigned prefix.");
  }
  const result = segments.join("/");
  if (result.length > 512) throw new Error("Storage object key is too long.");
  return result;
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function toUploadBody(data: Buffer | Uint8Array | string): string | Buffer {
  return typeof data === "string" ? data : Buffer.from(data);
}

async function createSignedUrl(client: SupabaseClient, bucket: string, key: string, expiresInSeconds = SIGNED_URL_TTL_SECONDS): Promise<string> {
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(key, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Supabase Storage signed URL failed: ${error?.message ?? "empty URL"}`);
  }

  return data.signedUrl;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const { client, bucket } = getSupabaseStorage();
  const key = appendHashSuffix(normalizeStorageKey(relKey));
  const { error } = await client.storage.from(bucket).upload(key, toUploadBody(data), {
    contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  return { key, url: await createSignedUrl(client, bucket, key) };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const { client, bucket } = getSupabaseStorage();
  const key = normalizeStorageKey(relKey);
  return { key, url: await createSignedUrl(client, bucket, key) };
}

export async function storageGetSignedUrl(relKey: string, expiresInSeconds = SIGNED_URL_TTL_SECONDS): Promise<string> {
  const { client, bucket } = getSupabaseStorage();
  const ttl = Math.min(MAX_SIGNED_URL_TTL_SECONDS, Math.max(60, Math.floor(expiresInSeconds)));
  return createSignedUrl(client, bucket, normalizeStorageKey(relKey), ttl);
}
