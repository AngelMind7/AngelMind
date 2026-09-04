// Blueprint V4 canonical UTF module registry.
// Every blueprint module is available in the catalog/UI. Target-facing high-risk
// modules resolve to simulation-only adapters until an authorized production
// execution integration is explicitly implemented and verified.
const baseToolCatalog = [
  {toolKey:"burp_suite_pro",name:"Burp Suite Professional",category:"Web Application Testing",riskClass:"medium",approvalGate:"scope_check",verificationStatus:"verified",disposition:"candidate_passive_review",enabledByDefault:true},
  {toolKey:"jwt_tool",name:"jwt_tool (custom wrapper)",category:"Authentication",riskClass:"high",approvalGate:"human_approval",verificationStatus:"verified",disposition:"simulation_only",enabledByDefault:true},
  {toolKey:"dalfox",name:"Dalfox (custom polyglot)",category:"Injection",riskClass:"high",approvalGate:"human_approval",verificationStatus:"verified",disposition:"simulation_only",enabledByDefault:true},
  {toolKey:"ssrfmap",name:"SSRFmap (custom probe)",category:"Network",riskClass:"high",approvalGate:"human_approval",verificationStatus:"verified",disposition:"simulation_only",enabledByDefault:true},
  {toolKey:"interactsh",name:"Interactsh (custom OOB)",category:"Network",riskClass:"medium",approvalGate:"scope_check",verificationStatus:"verified",disposition:"candidate_passive_review",enabledByDefault:true},
  {toolKey:"ffuf",name:"ffuf (custom wordlist)",category:"Discovery",riskClass:"medium",approvalGate:"scope_check",verificationStatus:"verified",disposition:"candidate_passive_review",enabledByDefault:true},
  {toolKey:"cloudfox",name:"CloudFox (custom IAM mapper)",category:"Cloud",riskClass:"medium",approvalGate:"scope_check",verificationStatus:"verified",disposition:"candidate_passive_review",enabledByDefault:true},
  {toolKey:"gitleaks",name:"Gitleaks (auto-validate)",category:"Supply Chain",riskClass:"low",approvalGate:"auto_run",verificationStatus:"verified",disposition:"candidate_offline_or_artifact",enabledByDefault:true},
  {toolKey:"graphql_cop",name:"graphql-cop + InQL (custom)",category:"API",riskClass:"medium",approvalGate:"scope_check",verificationStatus:"verified",disposition:"candidate_passive_review",enabledByDefault:true},
  {toolKey:"sqlmap",name:"sqlmap (custom tamper)",category:"Injection",riskClass:"critical",approvalGate:"human_approval",verificationStatus:"verified",disposition:"simulation_only",enabledByDefault:true},
  {toolKey:"nuclei",name:"Nuclei (custom template)",category:"Discovery",riskClass:"medium",approvalGate:"scope_check",verificationStatus:"verified",disposition:"candidate_passive_review",enabledByDefault:true},
  {toolKey:"subfinder",name:"Subfinder (custom permutation)",category:"Discovery",riskClass:"low",approvalGate:"auto_run",verificationStatus:"verified",disposition:"candidate_passive_review",enabledByDefault:true},
  {toolKey:"httpx",name:"httpx (custom probe)",category:"Discovery",riskClass:"low",approvalGate:"auto_run",verificationStatus:"verified",disposition:"candidate_passive_review",enabledByDefault:true},
  {toolKey:"trivy",name:"Trivy (custom dependency)",category:"Supply Chain",riskClass:"low",approvalGate:"auto_run",verificationStatus:"verified",disposition:"candidate_offline_or_artifact",enabledByDefault:true},
  {toolKey:"naabu",name:"naabu (custom port profile)",category:"Discovery",riskClass:"low",approvalGate:"scope_check",verificationStatus:"verified",disposition:"candidate_passive_review",enabledByDefault:true},
  {toolKey:"katana",name:"katana (custom crawler)",category:"Discovery",riskClass:"low",approvalGate:"scope_check",verificationStatus:"verified",disposition:"candidate_passive_review",enabledByDefault:true},
  {toolKey:"custom_scripts",name:"Custom Scripts (Python/Node)",category:"Fallback",riskClass:"high",approvalGate:"human_approval",verificationStatus:"verified",disposition:"simulation_only",enabledByDefault:true},
];

const generatedFamilies = [
  "recon_subfinder","recon_naabu","recon_httpx","recon_cloudfox","recon_gitleaks","recon_amass","recon_theharvester",
  "scan_nuclei","scan_trivy","scan_web","scan_api","scan_mobile","scan_cloud","scan_network",
  "research_sqlmap","research_dalfox","research_ssrfmap","research_jwt","research_rce","research_deserialization","research_authz","research_ssti",
  "fuzz_ffuf","fuzz_graphql","fuzz_arjun","fuzz_feroxbuster",
  "c2_simulation","c2_listener_simulation","c2_payload_simulation","c2_pivot_simulation","c2_delivery_simulation",
  "phish_email_simulation","phish_landing_simulation","phish_tracker_simulation","phish_pretext_library",
  "intel_darkweb","intel_credentials","intel_ioc","intel_threat_actor","intel_brand",
  "osint_person","osint_org","osint_infra","osint_metadata",
  "post_privesc_simulation","post_lateral_simulation","post_persistence_simulation","post_staging_simulation","post_exfil_simulation","post_cleanup_simulation",
  "custom_python","custom_bash","custom_go","custom_docker","custom_ai_prompt"
];

export const generatedToolCatalog = [
  ...baseToolCatalog,
  ...generatedFamilies.map(toolKey => {
    const targetFacing = toolKey.startsWith("c2_") || toolKey.startsWith("phish_") || toolKey.startsWith("post_") || toolKey.startsWith("research_");
    return {
      toolKey,
      name: toolKey.replaceAll("_", " "),
      category: toolKey.split("_")[0].toUpperCase(),
      riskClass: targetFacing ? "high" : "low",
      approvalGate: targetFacing ? "human_approval" : "scope_check",
      verificationStatus: "manifest_only",
      disposition: targetFacing ? "simulation_only" : "candidate_passive_review",
      enabledByDefault: true,
    };
  }),
];

export const toolCatalog = generatedToolCatalog;
export default generatedToolCatalog;
