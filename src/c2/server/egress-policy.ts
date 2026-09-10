export type EgressMode = "rotating" | "static" | "sticky_session";
export type EgressFallback = "next_proxy" | "abort" | "retry";
export type EgressProvider = "residential" | "mobile" | "isp" | "socks5" | "cloud_redirector";

export type EgressPolicy = {
  mode: EgressMode;
  provider: EgressProvider;
  rotation: "per_request" | "per_minute" | "per_target";
  geography?: { country?: string; city?: string; asn?: string };
  fallback: EgressFallback;
  allowedTargetsOnly: true;
  blockInternalRanges: true;
};

export type EgressDecision = {
  allowed: boolean;
  reason?: string;
  policy: EgressPolicy;
};

/**
 * V4 OPSEC gap fix represented as a governance contract.
 * Provider selection/credentialed proxying stays outside this source-controlled
 * policy layer; the runtime must never infer authorization from a proxy choice.
 */
export function validateEgressPolicy(policy: EgressPolicy): EgressDecision {
  if (policy.allowedTargetsOnly !== true) return { allowed: false, reason: "allowed_targets_only_required", policy };
  if (policy.blockInternalRanges !== true) return { allowed: false, reason: "internal_ranges_must_be_blocked", policy };
  if (policy.mode === "rotating" && policy.rotation === "per_target" && !policy.geography) {
    return { allowed: false, reason: "geography_required_for_target_rotation", policy };
  }
  return { allowed: true, policy };
}
