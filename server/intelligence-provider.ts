import type { IntelligenceFeedItem } from "./control-plane/intelligence-engine";

const MAX_BODY_BYTES = 2_000_000;
const REQUEST_TIMEOUT_MS = 15_000;

export function assertAllowedIntelligenceUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("Intelligence provider URL must use HTTPS.");
  const allowlist = (process.env.INTELLIGENCE_PROVIDER_HOSTS ?? "").split(",").map(host => host.trim().toLowerCase()).filter(Boolean);
  if (allowlist.length && !allowlist.includes(url.hostname.toLowerCase())) throw new Error("Intelligence provider host is not allowlisted.");
  return url;
}

function asItem(value: unknown): IntelligenceFeedItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Provider item must be an object.");
  const item = value as Record<string, unknown>;
  const data = item.data && typeof item.data === "object" && !Array.isArray(item.data) ? item.data as Record<string, unknown> : item;
  return {
    source: String(item.source ?? "provider"),
    observedAt: new Date(String(item.observedAt ?? item.observed_at ?? new Date().toISOString())).toISOString(),
    assetRef: String(item.assetRef ?? item.asset_ref ?? item.asset ?? ""),
    confidence: Number(item.confidence ?? 50),
    reference: item.reference == null ? undefined : String(item.reference),
    data,
  };
}

export async function fetchIntelligenceFeed(rawUrl: string): Promise<IntelligenceFeedItem[]> {
  const url = assertAllowedIntelligenceUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`Intelligence provider returned HTTP ${response.status}.`);
    const body = await response.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) throw new Error("Intelligence provider response exceeds the 2 MB limit.");
    let parsed: unknown;
    try { parsed = JSON.parse(Buffer.from(body).toString("utf8")); } catch { throw new Error("Intelligence provider response is not valid JSON."); }
    const items: unknown[] | null = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).items) ? (parsed as Record<string, unknown>).items as unknown[] : null;
    if (!items || items.length < 1 || items.length > 100) throw new Error("Intelligence provider must return 1 to 100 items.");
    return items.map(asItem);
  } finally {
    clearTimeout(timer);
  }
}
