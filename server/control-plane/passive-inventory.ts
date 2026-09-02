export type PassiveAsset = { value: string; hostname: string; source: "csv" | "json"; inScope: boolean; reason: "allowlisted" | "excluded" | "outside-allowlist" };

const hostnameOf = (value: string) => {
  try { return new URL(value.includes("://") ? value : `https://${value}`).hostname.toLowerCase(); } catch { return value.trim().toLowerCase().replace(/\.$/, ""); }
};
const matches = (hostname: string, rule: string) => { const normalized = rule.trim().toLowerCase().replace(/^\*\./, "").replace(/\.$/, ""); return Boolean(normalized) && (hostname === normalized || hostname.endsWith(`.${normalized}`)); };

export function parsePassiveInventory(input: { content: string; format: "csv" | "json"; allowlist: string[]; exclusions: string[] }): PassiveAsset[] {
  if (!input || typeof input.content !== "string" || (input.format !== "csv" && input.format !== "json") || !Array.isArray(input.allowlist) || !Array.isArray(input.exclusions) || !input.allowlist.every(rule => typeof rule === "string") || !input.exclusions.every(rule => typeof rule === "string")) throw new Error("Passive inventory input is invalid.");
  if (input.content.length > 500_000) throw new Error("Passive inventory is limited to 500 KB.");
  const values = input.format === "json" ? parseJson(input.content) : parseCsv(input.content);
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean))).map(value => {
    const hostname = hostnameOf(value);
    const excluded = input.exclusions.some(rule => matches(hostname, rule));
    const allowed = input.allowlist.some(rule => matches(hostname, rule));
    return { value, hostname, source: input.format, inScope: allowed && !excluded, reason: excluded ? "excluded" : allowed ? "allowlisted" : "outside-allowlist" };
  });
}

function parseJson(content: string): string[] {
  const parsed: unknown = JSON.parse(content);
  if (!Array.isArray(parsed)) throw new Error("JSON inventory must be an array of hostnames or URLs.");
  return parsed.filter((item): item is string => typeof item === "string");
}
function parseCsv(content: string): string[] {
  return content.split(/\r?\n/).slice(0, 10_001).map(line => line.split(",")[0]?.trim().replace(/^['\"]|['\"]$/g, "") ?? "").filter(value => value && !["asset", "hostname", "host", "url"].includes(value.toLowerCase()));
}
