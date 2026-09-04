import { test, expect, type APIRequestContext } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";
const token = process.env.ANGELMIND_E2E_TOKEN;

type TrpcResult<T> = { result?: { data?: { json?: T } }; error?: { json?: { message?: string } } }[];

async function callTrpc<T>(request: APIRequestContext, procedure: string, input?: unknown, method: "query" | "mutation" = "query") {
  const encoded = encodeURIComponent(JSON.stringify({ 0: { json: input ?? null } }));
  const response = await request.fetch(`/api/trpc/${procedure}?batch=1&input=${encoded}`, { method: method === "mutation" ? "POST" : "GET" });
  expect(response.ok(), `${procedure} returned ${response.status()}`).toBeTruthy();
  const body = (await response.json()) as TrpcResult<T>;
  const error = body[0]?.error?.json?.message;
  expect(error, `${procedure} failed`).toBeUndefined();
  return body[0]?.result?.data?.json as T;
}

test.describe("authenticated full lifecycle contract", () => {
  test("workspace → research session → asset → observation → finding", async ({ request }) => {
    test.skip(!token, "Set ANGELMIND_E2E_TOKEN to run against an authenticated staging environment.");
    const authenticated = await request.newContext({
      baseURL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`,
        "x-request-id": `e2e-lifecycle-${Date.now()}`,
        "x-trace-id": `e2e-trace-${Date.now()}`,
      },
    });
    try {
      const marker = Date.now();
      const workspace = await callTrpc<{ id: number }>(authenticated, "workspace.create", {
        name: `E2E lifecycle ${marker}`,
        programName: "Authorized passive research rehearsal",
        safeHarbor: "This staging contract is limited to passive, authorized rehearsal data.",
        codeOfConduct: "No target contact, exploitation, or external delivery is permitted.",
        allowlist: ["example.test"],
        exclusions: ["payments.example.test"],
        budgetCents: 100,
        sessionLimitMinutes: 30,
        cooldownMinutes: 15,
        retentionDays: 30,
      }, "mutation");
      expect(workspace?.id).toBeGreaterThan(0);

      const session = await callTrpc<{ id: number }>(authenticated, "research.createSession", { workspaceId: workspace.id, title: "Authenticated lifecycle rehearsal" }, "mutation");
      expect(session?.id).toBeGreaterThan(0);

      const asset = await callTrpc<{ id: number }>(authenticated, "research.createAsset", { sessionId: session.id, assetType: "domain", value: "example.test", hostname: "example.test" }, "mutation");
      expect(asset?.id).toBeGreaterThan(0);

      const observation = await callTrpc<{ id: number }>(authenticated, "research.createObservation", { sessionId: session.id, assetId: asset.id, title: "Passive DNS observation", content: "Staging fixture observation; no network request was made." }, "mutation");
      expect(observation?.id).toBeGreaterThan(0);

      const finding = await callTrpc<{ id: number }>(authenticated, "research.promoteObservationToFinding", { sessionId: session.id, observationId: observation.id, confidence: 50, impactSummary: "Staging fixture finding requiring human review." }, "mutation");
      expect(finding?.id).toBeGreaterThan(0);

      const sessions = await callTrpc<Array<{ id: number }>>(authenticated, "research.sessions", { workspaceId: workspace.id });
      expect(sessions.some(item => item.id === session.id)).toBeTruthy();
    } finally {
      await authenticated.dispose();
    }
  });
});
