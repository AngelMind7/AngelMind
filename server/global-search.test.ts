import { describe, expect, it } from "vitest";
import { createSemanticVector, semanticSimilarity } from "./global-search";

describe("semantic search vectors", () => {
  it("creates deterministic normalized vectors", () => {
    const vector = createSemanticVector("Credential exposure in authentication response");
    expect(vector).toHaveLength(96);
    expect(vector).toEqual(createSemanticVector("Credential exposure in authentication response"));
    expect(semanticSimilarity(vector, vector)).toBeCloseTo(1, 8);
  });

  it("ranks related text above unrelated text", () => {
    const query = createSemanticVector("credential exposure authentication");
    const related = createSemanticVector("authentication response exposes a credential-bearing token");
    const unrelated = createSemanticVector("quarterly deployment schedule for routine releases");
    expect(semanticSimilarity(query, related)).toBeGreaterThan(semanticSimilarity(query, unrelated));
  });
});
