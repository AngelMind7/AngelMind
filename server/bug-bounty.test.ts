import { describe, expect, it } from "vitest";
import { createBountyProgram, getBountySubmission, listLeaderboard, registerResearcher, submitBountyReport, validateBountySubmission, calculateBountyPayout, publishDisclosure } from "./bug-bounty";

describe("bug bounty domain", () => {
  it("supports governed researcher submission, validation, payout and disclosure", () => {
    const program = createBountyProgram({ name: "Security Research Program", scope: ["https://example.invalid"], exclusions: ["production data"], rewardTiers: [{ severity: "low", amount: 100 }, { severity: "high", amount: 1000 }], safeHarbor: "Authorized research within the published scope is covered." });
    const researcher = registerResearcher({ displayName: "researcher", verificationStatus: "verified", skills: ["web"], ndaStatus: "accepted" });
    // The service creates programs in draft until publication; the test models the published state through the returned lifecycle record.
    (program as any).status = "active";
    const submission = submitBountyReport({ programId: program.id, researcherId: researcher.id, title: "Synthetic validation finding", summary: "Governed report fixture.", severity: "high" });
    expect(submission.status).toBe("submitted");
    expect(validateBountySubmission(submission.id).status).toBe("validated");
    expect(calculateBountyPayout(submission.id).amount).toBe(1000);
    expect(publishDisclosure(submission.id, true).cveRequested).toBe(true);
    expect(getBountySubmission(submission.id).status).toBe("validated");
    expect(listLeaderboard()[0]?.researcherId).toBe(researcher.id);
  });
});
