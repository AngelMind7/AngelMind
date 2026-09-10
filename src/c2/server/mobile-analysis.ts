export type MobileAnalysisTier = "static" | "android_dynamic_queue" | "ios_self_hosted";

export type MobileAnalysisRequest = {
  tier: MobileAnalysisTier;
  artifactType: "apk" | "ipa";
  artifactName: string;
};

export type MobileAnalysisPlan = {
  accepted: boolean;
  tier: MobileAnalysisTier;
  adapters: string[];
  queueRequired: boolean;
  constraints: string[];
};

/** Blueprint mobile gap: keep the platform contract explicit while avoiding
 * automatic device/emulator execution from the control plane. */
export function planMobileAnalysis(request: MobileAnalysisRequest): MobileAnalysisPlan {
  if (!request.artifactName.trim()) return { accepted: false, tier: request.tier, adapters: [], queueRequired: false, constraints: ["artifact_name_required"] };
  if (request.tier === "static") {
    return {
      accepted: request.artifactType === "apk" || request.artifactType === "ipa",
      tier: request.tier,
      adapters: request.artifactType === "apk" ? ["jadx-decompile", "apktool-extract", "androguard-analysis"] : ["plist-and-binary-metadata"],
      queueRequired: false,
      constraints: ["artifact_only", "no_device_execution"],
    };
  }
  if (request.tier === "android_dynamic_queue") {
    return { accepted: request.artifactType === "apk", tier: request.tier, adapters: ["android-emulator", "frida-analysis"], queueRequired: true, constraints: ["dedicated-runner-required", "max-concurrent-5", "timeout-30m", "authorized-lab-only"] };
  }
  return { accepted: request.artifactType === "ipa", tier: request.tier, adapters: ["macos-device-runner"], queueRequired: true, constraints: ["self-hosted-mac-required", "physical-or-approved-device", "authorized-lab-only"] };
}
