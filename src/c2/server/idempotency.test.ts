import { beforeEach, describe, expect, it, vi } from "vitest";

const records = new Map<string, Record<string, unknown>>();
let deadlockOnInsert = false;

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
        if (deadlockOnInsert) throw new Error("ER_LOCK_DEADLOCK: Deadlock found when trying to get lock");
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
  beforeEach(() => {
    records.clear();
    deadlockOnInsert = false;
  });

  it("normalizes valid keys and rejects invalid lengths", () => {
    expect(normalizeIdempotencyKey("  request-123  ")).toBe("request-123");
    expect(() => normalizeIdempotencyKey("short")).toThrow(/8-180/);
    expect(() => normalizeIdempotencyKey("x".repeat(181))).toThrow(/8-180/);
  });

  it("produces a stable SHA-256 request fingerprint", () => {
    const first = hashIdempotencyRequest({ workspaceId: 7, action: "create" });
    const second = hashIdempotencyRequest({ workspaceId: 7, action: "create" });
    const reordered = hashIdempotencyRequest({ action: "create", workspaceId: 7 });
    const different = hashIdempotencyRequest({ workspaceId: 7, action: "delete" });
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toBe(first);
    expect(reordered).toBe(first);
    expect(different).not.toBe(first);
    expect(() => hashIdempotencyRequest(undefined)).toThrow(/JSON-serializable/);
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

  it("marks a network timeout as failed and refuses an unsafe retry", async () => {
    const timeout = new Error("network timeout");
    await expect(executeIdempotent({ userId: 7, scope: "finding.create", key: "request-timeout", request: { title: "timeout" }, handler: async () => { throw timeout; } })).rejects.toBe(timeout);
    expect(records.values().next().value).toMatchObject({ status: "failed" });
    await expect(executeIdempotent({ userId: 7, scope: "finding.create", key: "request-timeout", request: { title: "timeout" }, handler: async () => ({ createdId: 1 }) })).rejects.toThrow(/previous request.*failed/i);
  });

  it("propagates a database deadlock without creating a false idempotency replay", async () => {
    deadlockOnInsert = true;
    await expect(executeIdempotent({ userId: 7, scope: "finding.create", key: "request-deadlock", request: { title: "deadlock" }, handler: async () => ({ createdId: 2 }) })).rejects.toThrow(/ER_LOCK_DEADLOCK/);
    expect(records).toHaveLength(0);
  });

  it("replays the completed response after the first request", async () => {
    const first = await executeIdempotent({ userId: 7, scope: "finding.create", key: "request-456", request: { title: "same" }, handler: async () => ({ createdId: 99 }) });
    const second = await executeIdempotent({ userId: 7, scope: "finding.create", key: "request-456", request: { title: "same" }, handler: async () => ({ createdId: 100 }) });
    expect(first).toEqual({ value: { createdId: 99 }, replayed: false });
    expect(second).toEqual({ value: { createdId: 99 }, replayed: true });
  });
});
