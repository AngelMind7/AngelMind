import { describe, expect, it } from "vitest";
import { approvePurpleTeamExercise, createPurpleTeamExercise, planPurpleTeamExercise, runPurpleTeamExercise } from "./purple-team";

describe("governed purple-team exercises", () => {
  it("requires approval before execution", () => {
    const exercise = createPurpleTeamExercise(901, { name: "Detection validation", objective: "Validate synthetic detections", workspaceId: 1, scenarioId: "pt-lab-baseline", startAt: "2026-09-05T00:00:00Z", endAt: "2026-09-05T02:00:00Z", rulesOfEngagement: "Synthetic lab only; audited." });
    expect(() => runPurpleTeamExercise(901, exercise.id)).toThrow(/Approval required/);
    planPurpleTeamExercise(901, exercise.id);
    approvePurpleTeamExercise(901, exercise.id);
    expect(runPurpleTeamExercise(901, exercise.id)).toMatchObject({ exerciseId: exercise.id, detectedSteps: 1, missedSteps: 1, coveragePercent: 50 });
  });
});
