import { describe, expect, it } from "vitest";
import { AngelMindApiError, AngelMindRestV1Client } from "../api/rest-v1-client";

describe("REST v1 TypeScript client", () => {
  it("serializes scoped search requests and parses the versioned envelope", async () => {
    let requestedUrl = "";
    let requestedAuthorization = "";
    const client = new AngelMindRestV1Client({
      baseUrl: "https://api.example.test",
      apiKey: "am_test_secret",
      fetch: async (input, init) => {
        requestedUrl = String(input);
        requestedAuthorization = new Headers(init?.headers).get("Authorization") ?? "";
        return new Response(JSON.stringify({ data: { query: "auth", results: [], hasNextPage: false, nextCursor: null, facets: {} }, apiVersion: "v1" }), { status: 200, headers: { "content-type": "application/json" } });
      },
    });

    const response = await client.search(42, { query: "auth", limit: 10, cursor: "next", entityTypes: ["finding", "evidence"], freshnessDays: 30 });
    expect(response.apiVersion).toBe("v1");
    expect(requestedUrl).toContain("/api/v1/workspaces/42/search?");
    expect(requestedUrl).toContain("q=auth");
    expect(requestedUrl).toContain("entityTypes=finding%2Cevidence");
    expect(requestedAuthorization).toBe("Bearer am_test_secret");
  });

  it("raises a typed error for versioned error envelopes", async () => {
    const client = new AngelMindRestV1Client({
      baseUrl: "https://api.example.test",
      fetch: async () => new Response(JSON.stringify({ error: { code: "FORBIDDEN", message: "Workspace tidak dapat diakses." }, apiVersion: "v1" }), { status: 403 }),
    });
    await expect(client.health()).rejects.toMatchObject({ status: 403, code: "FORBIDDEN", apiVersion: "v1" });
    await expect(client.health()).rejects.toBeInstanceOf(AngelMindApiError);
  });
});
