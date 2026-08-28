import { Activity, CircleStop, Clock3, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow, NeonFrame } from "@/components/NeonFrame";
import { trpc } from "@/lib/trpc";
import { useLocale } from "@/contexts/LocaleContext";

export default function MissionControl() {
  const { formatDate } = useLocale();
  const dashboard = trpc.control.dashboard.useQuery();
  const runs = trpc.rehearsal.listRuns.useQuery();

  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col justify-between gap-4 border-b border-cyan-300/15 pb-6 sm:flex-row sm:items-end"><div><Eyebrow>Mission control / safe mode</Eyebrow><h1 className="mt-2 font-display text-4xl font-black uppercase tracking-[-.05em] text-white">Research <span className="neon-pink">Loop</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">A real run ledger for governed offline rehearsals. There is no live terminal, target traffic, or executable tool channel in this control plane.</p></div><Badge className="w-fit border border-cyan-300/30 bg-cyan-300/10 font-mono text-[10px] uppercase tracking-[.15em] text-cyan-200">Network: disabled</Badge></header>
    <div className="grid gap-4 md:grid-cols-3"><StatusCard icon={Activity} label="Recorded runs" value={String(dashboard.data?.runCount ?? 0)} /><StatusCard icon={ShieldCheck} label="Control coverage" value={`${dashboard.data?.controlCoverage ?? 0}%`} /><StatusCard icon={Clock3} label="Model-use events" value={String(dashboard.data?.modelUseCount ?? 0)} /></div>
    <NeonFrame className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><Eyebrow>Run manager</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold text-white">Governed rehearsal ledger</h2></div><Button variant="outline" size="sm" disabled><CircleStop className="mr-2 h-4 w-4" />Emergency stop (idle)</Button></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="font-mono text-[10px] uppercase tracking-[.14em] text-slate-500"><tr><th className="pb-3 font-normal">Mode</th><th className="pb-3 font-normal">Status</th><th className="pb-3 font-normal">Tier</th><th className="pb-3 font-normal">Tasks</th><th className="pb-3 font-normal">Created</th></tr></thead><tbody>{runs.data?.length ? runs.data.map(run => <tr key={run.id} className="border-t border-cyan-300/10"><td className="py-3 text-slate-200">{run.mode.replaceAll("_", " ")}</td><td className="py-3"><Badge variant="outline" className="border-cyan-300/25 text-cyan-200">{run.status}</Badge></td><td className="py-3 font-mono text-xs text-fuchsia-300">{run.governanceTier}</td><td className="py-3 text-slate-300">{run.plannedTaskCount}</td><td className="py-3 text-slate-500">{formatDate(run.createdAt)}</td></tr>) : <tr><td colSpan={5} className="py-12 text-center text-slate-500">No persisted rehearsal runs yet. Start one from Command Center.</td></tr>}</tbody></table></div></NeonFrame>
  </div>;
}

function StatusCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) { return <NeonFrame className="p-4"><div className="flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[.13em] text-slate-500">{label}</span><Icon className="h-4 w-4 text-cyan-300" /></div><p className="mt-4 font-display text-3xl font-black text-white">{value}</p></NeonFrame>; }
