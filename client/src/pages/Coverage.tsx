import { BarChart3, FileCheck2, Gauge, ShieldCheck } from "lucide-react";
import { Eyebrow, NeonFrame } from "@/components/NeonFrame";
import { trpc } from "@/lib/trpc";

export default function Coverage() {
  const dashboard = trpc.control.dashboard.useQuery();
  const metrics = [
    { label: "Governance controls", value: dashboard.data?.controlCoverage ?? 0, icon: ShieldCheck, tone: "bg-cyan-300" },
    { label: "Validated findings", value: dashboard.data?.validatedFindingCount ? 100 : 0, icon: FileCheck2, tone: "bg-fuchsia-300" },
    { label: "Recorded operations", value: dashboard.data?.runCount ? 100 : 0, icon: BarChart3, tone: "bg-cyan-300" },
    { label: "Policy telemetry", value: dashboard.data?.runCount || dashboard.data?.policyBlockCount ? 100 : 0, icon: Gauge, tone: "bg-orange-300" },
  ];
  return <div className="mx-auto max-w-7xl space-y-6"><header><Eyebrow>Coverage / persisted telemetry</Eyebrow><h1 className="mt-2 font-display text-4xl font-black uppercase tracking-[-.05em] text-white">Control <span className="neon-pink">Coverage</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Coverage here describes recorded governance and evidence workflow state, not target discovery. Values are derived from persisted workspace records.</p></header><div className="grid gap-4 md:grid-cols-2">{metrics.map(({ label, value, icon: Icon, tone }) => <NeonFrame key={label} className="p-5"><div className="flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[.14em] text-slate-500">{label}</span><Icon className="h-4 w-4 text-cyan-300" /></div><div className="mt-5 flex items-end justify-between"><span className="font-display text-3xl font-black text-white">{value}%</span><span className="text-xs text-slate-500">from live records</span></div><div className="mt-4 h-2 overflow-hidden bg-white/5"><div className={`h-full ${tone} transition-[width] duration-500`} style={{ width: `${value}%` }} /></div></NeonFrame>)}</div><NeonFrame className="p-5 sm:p-6"><Eyebrow>Measurement boundary</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold text-white">What this view can prove</h2><div className="mt-5 grid gap-4 sm:grid-cols-3"><Boundary title="Scope readiness" value={`${dashboard.data?.controlCoverage ?? 0}%`} detail="Workspaces with safe-harbor, conduct, and allowlist records." /><Boundary title="Evidence confidence" value={String(dashboard.data?.validatedFindingCount ?? 0)} detail="Validated findings retained in the workspace ledger." /><Boundary title="Review pressure" value={String(dashboard.data?.pendingApprovalCount ?? 0)} detail="Approval records waiting for governed review." /></div></NeonFrame></div>;
}

function Boundary({ title, value, detail }: { title: string; value: string; detail: string }) { return <div className="border-l-2 border-cyan-300/60 pl-4"><p className="font-mono text-[10px] uppercase tracking-[.14em] text-cyan-200">{title}</p><p className="mt-2 font-display text-2xl font-bold text-white">{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p></div>; }
