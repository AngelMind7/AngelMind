export type RetestOutcome = "in_progress" | "passed" | "failed" | "inconclusive" | "cancelled";

export function assertRetestOutcome(input: { status: RetestOutcome; resultSummary: string; evidenceArtifactId?: number | null; existingEvidenceArtifactId?: number | null }) {
  const resultSummary = input.resultSummary.trim();
  if (resultSummary.length < 3 || resultSummary.length > 20_000) throw new Error("Retest result summary is required.");
  if (input.status === "passed" && !input.evidenceArtifactId && !input.existingEvidenceArtifactId) {
    throw new Error("A passed retest requires a scanned or promoted evidence artifact.");
  }
  return { resultSummary, evidenceArtifactId: input.evidenceArtifactId ?? input.existingEvidenceArtifactId ?? null };
}

