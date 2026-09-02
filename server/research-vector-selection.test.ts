import { describe, expect, it } from "vitest";
import { parseAssetMetadata, selectVectorsForAsset } from "./research-vector-selection";

describe("research vector selection", () => {
  it("selects deduplicated vectors from asset fingerprints in risk order", () => {
    const vectors = selectVectorsForAsset({ assetId: 7, metadata: { technologies: ["GraphQL", "JWT", "GraphQL"], features: ["file upload"] } });
    expect(vectors.map(vector => vector.vectorKey)).toEqual([
      "auth-jwt-none",
      "file-upload-abuse",
      "auth-jwt-alg-confusion",
      "graphql-introspection-abuse",
    ]);
    expect(new Set(vectors.map(vector => vector.vectorKey)).size).toBe(vectors.length);
    expect(vectors[0]?.rationale).toContain("fingerprint:");
  });

  it("handles malformed metadata without throwing", () => {
    expect(parseAssetMetadata("not-json")).toEqual({ raw: "not-json" });
    expect(selectVectorsForAsset({ assetId: 1, metadata: "{" })).toEqual([]);
  });

  it("only suggests registered executable tool keys across fingerprint rules", () => {
    const registered = new Set([
      "burp_suite_pro", "jwt_tool", "dalfox", "ssrfmap", "interactsh",
      "ffuf", "cloudfox", "secrets_detection.1", "graphql_cop", "sqlmap",
      "nuclei", "asset_intelligence.28", "httpx", "dependencies.12", "custom_scripts",
    ]);
    const samples = [
      "JWT GraphQL file upload", "jinja sql xml webhook cors sourcemap websocket password reset",
      "blind sql deserialize solidity cache-control mass assignment idor stack trace apk subdomain redirect=",
      "no csrf race condition package.json reflected xss path traversal crlf host header command injection s3.amazonaws.com iam session fixation",
    ];
    for (const metadata of samples) {
      for (const vector of selectVectorsForAsset({ assetId: 1, metadata })) {
        expect(vector.suggestedAdapters.every(adapter => registered.has(adapter))).toBe(true);
      }
    }
  });

});
