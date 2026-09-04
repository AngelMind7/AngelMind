import { createHash } from "node:crypto";

export type AssuranceEvidence = {
  requestId: string;
  toolKey: string;
  rawOutputSha256: string | null;
  normalizedEvidenceSha256: string | null;
  evidenceRefs: string[];
};

export type AssuranceFinding = {
  findingId?: number;
  ruleId: string;
  emittedKey: string;
  title: string;
  severity: "informational" | "low" | "medium" | "high" | "critical";
  confidence: number;
  evidenceRefs: string[];
};

export type ExecutionReport = {
  reportId: string;
  generatedAt: string;
  status: "review_required" | "ready_for_submission";
  summary: string;
  finding: AssuranceFinding;
  evidence: AssuranceEvidence;
  impactProof: {
    method: "evidence-backed-observation";
    supported: boolean;
    rationale: string;
  };
  submission: {
    allowed: false;
    reason: "manual_review_required";
  };
};

export function validateEvidenceChain(evidence: AssuranceEvidence, finding: AssuranceFinding) {
  const refs = new Set(evidence.evidenceRefs);
  const linked = finding.evidenceRefs.filter(ref => refs.has(ref));
  const hashesPresent = Boolean(evidence.rawOutputSha256 && evidence.normalizedEvidenceSha256);
  return {
    valid: Boolean(evidence.requestId && evidence.toolKey && hashesPresent && linked.length > 0),
    linkedRefs: linked,
    reason: !evidence.requestId
      ? "request_id_missing"
      : !evidence.toolKey
        ? "tool_key_missing"
        : !hashesPresent
          ? "evidence_hash_missing"
          : linked.length === 0
            ? "finding_evidence_reference_missing"
            : "valid",
  } as const;
}

export function buildImpactProof(evidence: AssuranceEvidence, finding: AssuranceFinding) {
  const chain = validateEvidenceChain(evidence, finding);
  return {
    method: "evidence-backed-observation" as const,
    supported: chain.valid,
    rationale: chain.valid
      ? `Finding ${finding.emittedKey} is backed by correlated evidence linked to request ${evidence.requestId}.`
      : `Impact proof withheld because the evidence chain is incomplete: ${chain.reason}.`,
  };
}

export function generateExecutionReport(input: {
  capability: string;
  evidence: AssuranceEvidence;
  finding: AssuranceFinding;
}) : ExecutionReport | null {
  const chain = validateEvidenceChain(input.evidence, input.finding);
  if (!chain.valid) return null;
  const impactProof = buildImpactProof(input.evidence, input.finding);
  const reportId = createHash("sha256")
    .update(JSON.stringify({ capability: input.capability, requestId: input.evidence.requestId, ruleId: input.finding.ruleId, emittedKey: input.finding.emittedKey, evidenceRefs: chain.linkedRefs }))
    .digest("hex");
  return {
    reportId,
    generatedAt: new Date().toISOString(),
    status: "review_required",
    summary: `${input.finding.title} was correlated from a governed ${input.capability} execution.`,
    finding: { ...input.finding, evidenceRefs: chain.linkedRefs },
    evidence: { ...input.evidence, evidenceRefs: chain.linkedRefs },
    impactProof,
    submission: { allowed: false, reason: "manual_review_required" },
  };
}
