import { createHash } from "node:crypto";

export type UsageEvent = {
  id: string;
  workspaceId: number;
  category: "ai_run" | "storage" | "worker" | "export";
  quantity: number;
  unitPriceCents: number;
  occurredAt: string;
  metadata?: Record<string, string>;
};

export type UsageInvoicePreview = {
  workspaceId: number;
  period: { start: string; end: string };
  currency: "USD";
  lineItems: Array<{ category: UsageEvent["category"]; quantity: number; amountCents: number }>;
  subtotalCents: number;
  quotaCents: number;
  withinQuota: boolean;
  payment: "disabled_external_provider";
  evidenceHash: string;
};

function assertDate(value: string, field: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`${field} must be an ISO date.`);
}

export function buildUsageInvoicePreview(input: {
  workspaceId: number;
  periodStart: string;
  periodEnd: string;
  quotaCents: number;
  events: UsageEvent[];
}): UsageInvoicePreview {
  if (!Number.isInteger(input.workspaceId) || input.workspaceId < 1) throw new Error("Workspace is invalid.");
  assertDate(input.periodStart, "periodStart");
  assertDate(input.periodEnd, "periodEnd");
  if (Date.parse(input.periodStart) >= Date.parse(input.periodEnd)) throw new Error("Usage period must be ordered.");
  if (!Number.isInteger(input.quotaCents) || input.quotaCents < 0 || input.quotaCents > 100_000_000) throw new Error("Quota is invalid.");
  if (input.events.length > 10_000) throw new Error("Usage event limit exceeded.");
  const seen = new Set<string>();
  const totals = new Map<UsageEvent["category"], { quantity: number; amountCents: number }>();
  for (const event of input.events) {
    if (seen.has(event.id)) throw new Error(`Duplicate usage event: ${event.id}`);
    seen.add(event.id);
    if (event.workspaceId !== input.workspaceId || !event.id || event.id.length > 160) throw new Error("Usage event workspace or id is invalid.");
    assertDate(event.occurredAt, "occurredAt");
    if (Date.parse(event.occurredAt) < Date.parse(input.periodStart) || Date.parse(event.occurredAt) >= Date.parse(input.periodEnd)) throw new Error("Usage event is outside invoice period.");
    if (!Number.isSafeInteger(event.quantity) || event.quantity < 0 || event.quantity > 1_000_000) throw new Error("Usage quantity is invalid.");
    if (!Number.isSafeInteger(event.unitPriceCents) || event.unitPriceCents < 0 || event.unitPriceCents > 1_000_000) throw new Error("Usage unit price is invalid.");
    const current = totals.get(event.category) ?? { quantity: 0, amountCents: 0 };
    current.quantity += event.quantity;
    current.amountCents += event.quantity * event.unitPriceCents;
    totals.set(event.category, current);
  }
  const lineItems = [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([category, value]) => ({ category, ...value }));
  const subtotalCents = lineItems.reduce((sum, item) => sum + item.amountCents, 0);
  const evidenceHash = createHash("sha256").update(JSON.stringify({ workspaceId: input.workspaceId, periodStart: input.periodStart, periodEnd: input.periodEnd, quotaCents: input.quotaCents, events: input.events })).digest("hex");
  return { workspaceId: input.workspaceId, period: { start: input.periodStart, end: input.periodEnd }, currency: "USD", lineItems, subtotalCents, quotaCents: input.quotaCents, withinQuota: subtotalCents <= input.quotaCents, payment: "disabled_external_provider", evidenceHash };
}
