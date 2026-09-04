import { canonicalExecutionPath, isTerminalExecutionState, type ExecutionState } from "./execution-state-machine";

export type ExecutionRecoverySnapshot = {
  state: ExecutionState;
  revision: number;
  workerLeaseExpired: boolean;
  runtimeCompleted: boolean;
  runtimeFailed: boolean;
  reportGenerated: boolean;
};

export type ExecutionRecoveryPlan = {
  action: "resume" | "finalize" | "retry" | "hold" | "noop";
  from: ExecutionState;
  next: ExecutionState | null;
  reason: string;
};

const nextState = (state: ExecutionState) => {
  const path = canonicalExecutionPath();
  const index = path.indexOf(state);
  return index >= 0 && index + 1 < path.length ? path[index + 1] : null;
};

/**
 * Computes a recovery decision without performing any side effect.
 * Durable workers can use this result after a lease expires or a process restarts.
 */
export function planExecutionRecovery(snapshot: ExecutionRecoverySnapshot): ExecutionRecoveryPlan {
  if (snapshot.revision < 0 || !Number.isInteger(snapshot.revision)) {
    throw new Error("Execution revision must be a non-negative integer.");
  }
  if (isTerminalExecutionState(snapshot.state)) {
    return { action: "noop", from: snapshot.state, next: null, reason: "execution_already_done" };
  }

  if (snapshot.state === "WORKER_EXECUTION") {
    if (snapshot.runtimeCompleted) {
      return { action: "finalize", from: snapshot.state, next: "PARSER", reason: "runtime_completed_before_ledger_checkpoint" };
    }
    if (snapshot.runtimeFailed) {
      return { action: "retry", from: snapshot.state, next: null, reason: "runtime_failed_before_terminal_checkpoint" };
    }
    if (snapshot.workerLeaseExpired) {
      return { action: "retry", from: snapshot.state, next: null, reason: "worker_lease_expired" };
    }
    return { action: "hold", from: snapshot.state, next: null, reason: "active_worker_has_not_expired" };
  }

  if (snapshot.state === "REPORT_GENERATION" && snapshot.reportGenerated) {
    return { action: "resume", from: snapshot.state, next: "SUBMISSION", reason: "report_persisted_and_ready_for_review_transition" };
  }

  const next = nextState(snapshot.state);
  return next
    ? { action: "resume", from: snapshot.state, next, reason: "resume_from_durable_checkpoint" }
    : { action: "hold", from: snapshot.state, next: null, reason: "no_safe_recovery_transition" };
}
