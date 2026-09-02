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
});
