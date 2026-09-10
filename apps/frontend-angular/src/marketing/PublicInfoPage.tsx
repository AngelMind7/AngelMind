import { LanguageSelector } from "@/components/LanguageSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { translateStatic, useLocale } from "@/contexts/LocaleContext";
import { useSeoMetadata } from "@/seo";
import LiveStatus from "./LiveStatus";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";

type PageDefinition = {
  eyebrow: string;
  title: string;
  description: string;
  sections: Array<{ title: string; body: string }>;
};

const pages: Record<string, PageDefinition> = {
  "/how-it-works": {
    eyebrow: "How it works",
    title: "Governed research, from scope to evidence.",
    description: "AngelMind keeps authorization, policy, human review, evidence, and audit visible before a workflow can move forward.",
    sections: [
      { title: "01 / Define scope", body: "Record allowlists, exclusions, safe harbor, code of conduct, budget, and accountable workspace ownership." },
      { title: "02 / Rehearse safely", body: "Plan and review deterministic, network-free workflows before any future capability is considered." },
      { title: "03 / Review evidence", body: "Connect observations, hypotheses, evidence, findings, reports, and audit history for human review." },
    ],
  },
  "/programs": {
    eyebrow: "Programs",
    title: "Programs begin with rules, not a blank target field.",
    description: "Program discovery is currently a public, informational surface. Active program execution remains workspace-scoped and authorization-bound.",
    sections: [
      { title: "Scope first", body: "Every program should make included assets, exclusions, safe harbor, and out-of-scope actions explicit." },
      { title: "Researcher clarity", body: "Researchers need readable policy, reward, update, and reporting expectations before starting work." },
      { title: "No implied access", body: "A public program description never grants permission to test a system or access data." },
    ],
  },
  "/researchers": {
    eyebrow: "Researchers",
    title: "A researcher profile should show accountable work.",
    description: "AngelMind is designed to make specialization, research history, evidence quality, and review context more useful than raw activity volume.",
    sections: [
      { title: "Specialization", body: "Profiles can describe research areas, skills, experience, and preferences without exposing private workspace records." },
      { title: "Quality over volume", body: "Reputation should reflect valid findings, accepted reports, review quality, and responsible collaboration." },
      { title: "Privacy by boundary", body: "Public profile information must remain separate from organization, workspace, evidence, and security events." },
    ],
  },
  "/blog": {
    eyebrow: "Research / Blog",
    title: "Explain the operating model before the feature list.",
    description: "This public editorial surface is intentionally static until a reviewed content workflow and publication ownership are configured.",
    sections: [
      { title: "Safety notes", body: "Publish clear explanations of authorization, scope, evidence integrity, and human review." },
      { title: "Research practice", body: "Share defensive methodology and lessons without turning public content into unauthorized testing instructions." },
      { title: "Change history", body: "Keep product and policy changes dated, reviewable, and consistent with the deployed control plane." },
    ],
  },
  "/api-playground": {
    eyebrow: "API playground",
    title: "Explore contracts without executing operations.",
    description: "The public API playground is read-only by design. It must not accept credentials, send requests to customer workspaces, or invoke target-facing capabilities.",
    sections: [
      { title: "Schema preview", body: "Document versioned request and response contracts with representative, non-sensitive examples." },
      { title: "Permission-aware", body: "Authenticated API operations require server-side identity, workspace authorization, validation, and audit." },
      { title: "No hidden execution", body: "Public examples remain synthetic until a separately reviewed developer platform is enabled." },
    ],
  },
  "/acceptable-use": {
    eyebrow: "Acceptable use",
    title: "Use AngelMind only for authorized security research.",
    description: "The control plane supports accountable operations; it is not a license to access, probe, exploit, exfiltrate, or disrupt systems.",
    sections: [
      { title: "Allowed", body: "Use verified scope, safe harbor, human ownership, and approved workflows for defensive research." },
      { title: "Prohibited", body: "Do not use the product for unauthorized access, credential abuse, destructive activity, or evasion of controls." },
      { title: "Report concerns", body: "Escalate suspected abuse, policy bypass, or security issues through the deployment's designated contact." },
    ],
  },
  "/responsible-disclosure": {
    eyebrow: "Responsible disclosure",
    title: "Disclose security issues with care and traceability.",
    description: "A deployment must publish its real security contact and policy. This page provides the product boundary without collecting submissions by itself.",
    sections: [
      { title: "Minimize impact", body: "Stop when evidence is sufficient, avoid data access, and do not continue beyond explicit authorization." },
      { title: "Preserve evidence", body: "Record timestamps, scope, observed behavior, and reproducible details without including unnecessary sensitive data." },
      { title: "Use the configured channel", body: "Follow the deployment's published contact, encryption, response, and coordination expectations." },
    ],
  },
  "/data-processing": {
    eyebrow: "Data processing",
    title: "Processing boundaries should be explicit.",
    description: "The deployment operator must document lawful basis, retention, residency, subprocessors, access, export, deletion, and incident contacts.",
    sections: [
      { title: "Source of truth", body: "Workspace records, evidence metadata, audit events, and policy versions are managed through controlled server-side paths." },
      { title: "Retention and deletion", body: "Define retention schedules and verified deletion behavior for users, workspaces, evidence, reports, and derived records." },
      { title: "Operator responsibility", body: "Deployment-specific legal and privacy review is required before processing customer or research-sensitive data." },
    ],
  },
  "/pricing": {
    eyebrow: "Transparent plans",
    title: "Choose the control surface your team can defend.",
    description: "Every plan keeps policy, evidence, approval, and audit controls visible. Pricing copy is informational until a billing integration is explicitly configured.",
    sections: [
      { title: "Free / evaluation", body: "Explore the read-only control plane, synthetic API examples, rehearsal workflows, and public safety model." },
      { title: "Pro / team operations", body: "Coordinate governed workspaces, delegated reviews, findings, evidence, notifications, and operational analytics." },
      { title: "Enterprise / assurance", body: "Extend the same deterministic boundaries with organization-specific retention, audit, and deployment controls." },
    ],
  },
  "/changelog": {
    eyebrow: "Changelog",
    title: "A dated record of what changed and why.",
    description: "AngelMind treats operational changes as reviewable work: safety behavior, workflow contracts, localization, and interface improvements stay traceable.",
    sections: [
      { title: "Safety hardening", body: "Workspace-bound finding, report, comment, and incident evidence references now reject cross-workspace mismatches." },
      { title: "Trust Center", body: "Public safety boundaries now state human review requirements and the absence of active scanning or autonomous submission." },
      { title: "Responsive reliability", body: "The public shell avoids horizontal overflow on mobile and loads optional analytics only when configured." },
    ],
  },
  "/roadmap": {
    eyebrow: "Public roadmap",
    title: "Build the safe parts first. Prove them before expanding reach.",
    description: "The roadmap prioritizes deterministic safety, evidence integrity, useful operator workflows, and production validation before any external execution capability.",
    sections: [
      { title: "Now", body: "Control plane workflows, workspace isolation, policy and incident assurance, passive inventory, report review, i18n, and auditability." },
      { title: "Next", body: "Deeper dashboard surfaces, accessibility and performance automation, deployment observability, and safe inbound integration boundaries." },
      { title: "Later", body: "Optional target-facing capabilities require explicit legal authorization, threat modeling, human approval, and independent security review." },
    ],
  },
  "/status": {
    eyebrow: "Public status",
    title: "Operational posture, stated plainly.",
    description: "This status surface reports the product boundary and release posture without inventing live uptime claims that are not connected to production telemetry.",
    sections: [
      { title: "Control plane", body: "Available in the configured application environment. Authentication, workspace controls, rehearsal, findings, and audit surfaces are implemented." },
      { title: "External delivery", body: "Disabled by default. Webhook activation requires a confirmed HTTPS draft, secret reference, owner request, and separate reviewer decision." },
      { title: "Target interaction", body: "Not available in the public product surface. Synthetic examples and passive imports remain isolated from active testing." },
    ],
  },
  "/contact": {
    eyebrow: "Contact",
    title: "Bring a governance problem, not a shortcut.",
    description: "For enterprise conversations, security disclosure, or implementation questions, use the configured support channel for your deployment. This page does not collect or transmit personal data by itself.",
    sections: [
      { title: "Security disclosure", body: "Preserve evidence, avoid unauthorized testing, and follow the responsible disclosure policy published by the deploying organization." },
      { title: "Enterprise readiness", body: "Discuss retention, roles, approval delegation, audit export, deployment boundaries, and observability requirements." },
      { title: "Implementation support", body: "Review the documentation and operating model before enabling production workflows." },
    ],
  },
  "/academy": {
    eyebrow: "Academy",
    title: "Learn the operating model before you run the workflow.",
    description: "Short lessons explain scope, policy, evidence, human review, and safe research operations without teaching unauthorized exploitation.",
    sections: [
      { title: "Lesson 01 / Scope", body: "Define authorization, allowlists, exclusions, and the conditions that make a workspace eligible." },
      { title: "Lesson 02 / Governance", body: "Understand Tier 1, Tier 2, and Tier 3 decisions, including the mandatory human approval boundary." },
      { title: "Lesson 03 / Evidence", body: "Create reproducible, hashed, time-aware records that reviewers can inspect without hidden execution." },
    ],
  },
  "/privacy": {
    eyebrow: "Privacy",
    title: "Data handling should be inspectable.",
    description: "The application is designed around workspace isolation, least-privilege access, retention review, and explicit audit records. Deployment-specific legal text must be reviewed by the operator.",
    sections: [
      { title: "Workspace boundaries", body: "Operational records carry workspace identifiers and authorization checks before they are read or changed." },
      { title: "Retention posture", body: "Evidence retention is reviewed and recorded; automatic deletion is not silently performed by the control plane." },
      { title: "Deployment responsibility", body: "The deploying organization must configure lawful processing terms, data residency, subprocessors, and incident contacts." },
    ],
  },
  "/terms": {
    eyebrow: "Terms",
    title: "Use the control plane only within authorized programs.",
    description: "The application supports governed security research operations. It is not permission to test systems, access data, or bypass controls without explicit authorization.",
    sections: [
      { title: "Authorized use", body: "Operate only in workspaces with verified safe harbor, scope, code of conduct, and accountable human ownership." },
      { title: "Prohibited use", body: "Unauthorized access, destructive testing, data exfiltration, credential abuse, and autonomous submission remain outside the safe product boundary." },
      { title: "Human accountability", body: "Reviewers remain responsible for decisions, evidence quality, legal context, and any external action." },
    ],
  },
  "/cookies": {
    eyebrow: "Cookie policy",
    title: "Session state with a narrow purpose.",
    description: "The authenticated application uses session state to provide access. Optional analytics is not loaded unless the deployment supplies explicit configuration.",
    sections: [
      { title: "Essential session", body: "Authentication and security state are required for protected workspace routes." },
      { title: "Optional analytics", body: "Analytics remains disabled when its endpoint or site identifier is absent or malformed." },
      { title: "Your controls", body: "Deployment operators should publish retention and consent details appropriate to their jurisdiction and audience." },
    ],
  },
};

export default function PublicInfoPage() {
  const [location] = useLocation();
  const { locale } = useLocale();
  const page = pages[location] ?? pages["/roadmap"];
  const text = (value: string) => translateStatic(locale, value);
  useSeoMetadata({ path: location, title: `${text(page.title)} | AngelMind`, description: text(page.description) });
  return (
    <div className="min-h-screen overflow-hidden bg-[#05060b] text-slate-100">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/product" className="font-display text-sm font-black tracking-[.22em] text-fuchsia-300">ANGELMIND</Link>
        <div className="flex items-center gap-3"><Link href="/docs" className="hidden text-sm text-slate-300 transition hover:text-cyan-200 sm:block">{text("Documentation")}</Link><LanguageSelector /></div>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8">
        <Badge variant="outline" className="border-cyan-300/40 bg-cyan-300/5 font-mono text-[10px] uppercase tracking-[.16em] text-cyan-200">{text(page.eyebrow)}</Badge>
        <div className="grid gap-10 pt-7 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
          <div><h1 className="max-w-4xl font-display text-5xl font-black uppercase leading-[.9] tracking-[-.055em] text-white sm:text-7xl">{text(page.title)}</h1><p className="mt-7 max-w-2xl text-base leading-8 text-slate-400">{text(page.description)}</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/product"><Button className="neon-button">{text("Open control plane")} <ArrowRight className="ml-2 h-4 w-4" /></Button></Link></div></div>
          <div className="border border-cyan-300/20 bg-[#0b1020]/80 p-6 shadow-[0_0_60px_rgba(34,211,238,.08)]"><ShieldCheck className="h-6 w-6 text-fuchsia-300" /><p className="mt-5 font-display text-xl font-bold text-white">{text("Safety stays visible at every boundary.")}</p><p className="mt-3 text-sm leading-6 text-slate-400">{text("No target contact. No autonomous submission. No hidden bypass.")}</p></div>
        </div>
        <section className="mt-16 grid gap-4 md:grid-cols-3">{page.sections.map(section => <article key={section.title} className="border border-cyan-300/15 bg-white/[.025] p-6"><CheckCircle2 className="h-5 w-5 text-cyan-300" /><h2 className="mt-7 font-display text-xl font-bold text-white">{text(section.title)}</h2><p className="mt-3 text-sm leading-6 text-slate-400">{text(section.body)}</p></article>)}</section>
        {location === "/status" ? <LiveStatus /> : null}
      </main>
      <footer className="border-t border-cyan-300/15 px-5 py-8 text-center text-xs text-slate-500">{text("Public information surface · governed by deployment policy")}</footer>
    </div>
  );
}

export { pages as publicInfoPageDefinitions };

// This module intentionally remains static: public pages create no credentials, target requests, or external delivery.
