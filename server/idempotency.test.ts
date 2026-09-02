import { beforeEach, describe, expect, it, vi } from "vitest";

const records = new Map<string, Record<string, unknown>>();

vi.mock("./db", () => ({
  getDb: async () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => Array.from(records.values()),
        }),
      }),
    }),
    insert: () => ({
      values: async (value: Record<string, unknown>) => {
        const key = `${value.userId}:${value.scope}:${value.idempotencyKey}`;
        if (records.has(key)) throw new Error("duplicate key");
        records.set(key, { id: records.size + 1, ...value });
      },
    }),
    update: () => ({
      set: (value: Record<string, unknown>) => ({
        where: async () => {
          const record = Array.from(records.values())[0];
          if (record) Object.assign(record, value);
        },
      }),
    }),
  }),
}));

import { executeIdempotent, hashIdempotencyRequest, normalizeIdempotencyKey } from "./idempotency";

describe("generic idempotency contract", () => {
  beforeEach(() => records.clear());

  it("normalizes valid keys and rejects invalid lengths", () => {
    expect(normalizeIdempotencyKey("  request-123  ")).toBe("request-123");
    expect(() => normalizeIdempotencyKey("short")).toThrow(/8-180/);
    expect(() => normalizeIdempotencyKey("x".repeat(181))).toThrow(/8-180/);
  });

  it("produces a stable SHA-256 request fingerprint", () => {
    const first = hashIdempotencyRequest({ workspaceId: 7, action: "create" });
    const second = hashIdempotencyRequest({ workspaceId: 7, action: "create" });
    const different = hashIdempotencyRequest({ workspaceId: 7, action: "delete" });
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toBe(first);
    expect(different).not.toBe(first);
  });

  it("executes a concurrent idempotent request at most once", async () => {
    let executions = 0;
    const handler = async () => {
      executions += 1;
      await new Promise(resolve => setTimeout(resolve, 10));
      return { createdId: 42 };
    };
    const requests = Array.from({ length: 12 }, () => executeIdempotent({
      userId: 7,
      scope: "finding.create",
      key: "request-123",
      request: { title: "same finding" },
      handler,
    }));

    const results = await Promise.allSettled(requests);
    const fulfilled = results.filter(result => result.status === "fulfilled");
    const rejected = results.filter(result => result.status === "rejected");
    expect(executions).toBe(1);
    expect(fulfilled).toHaveLength(1);
    expect(fulfilled[0]).toMatchObject({ status: "fulfilled", value: { value: { createdId: 42 }, replayed: false } });
    expect(rejected).toHaveLength(11);
    expect(rejected.every(result => result.status === "rejected" && /already in progress/.test(String(result.reason)))).toBe(true);
  });

  it("replays the completed response after the first request", async () => {
    const first = await executeIdempotent({ userId: 7, scope: "finding.create", key: "request-456", request: { title: "same" }, handler: async () => ({ createdId: 99 }) });
    const second = await executeIdempotent({ userId: 7, scope: "finding.create", key: "request-456", request: { title: "same" }, handler: async () => ({ createdId: 100 }) });
    expect(first).toEqual({ value: { createdId: 99 }, replayed: false });
    expect(second).toEqual({ value: { createdId: 99 }, replayed: true });
  });
});
