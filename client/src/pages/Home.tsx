import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NeonFrame, Eyebrow } from "@/components/NeonFrame";
import { WorkspaceSetupDialog } from "@/components/WorkspaceSetupDialog";
import { trpc } from "@/lib/trpc";
import { useLocale } from "@/contexts/LocaleContext";
import { Activity, Bot, Braces, CircleDollarSign, Clock3, FileCheck2, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  const { locale, formatDate, copy } = useLocale();
  const dashboard = trpc.control.dashboard.useQuery();
  const workspaces = trpc.workspace.list.useQuery();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
  const [rehearsal, setRehearsal] = useState<{ taskCount: number; estimatedCostCents: number; estimatedDurationMinutes: number; networkCalls: 0; toolExecutions: 0; policy: { allowed: boolean; reasons: string[] } } | null>(null);
  const runRehearsal = trpc.rehearsal.run.useMutation({
    onSuccess: result => {
      setRehearsal(result);
      toast.success(result.policy.allowed ? "Rehearsal selesai tanpa network call." : "Rehearsal selesai dengan policy block.");
      dashboard.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const workspaceId = selectedWorkspaceId ?? workspaces.data?.[0]?.id;
  const selectedWorkspace = workspaces.data?.find(workspace => workspace.id === workspaceId);
  const cents = (value: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(value / 100);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="relative overflow-hidden px-1 py-5 sm:py-8">
        <div className="hud-line absolute left-0 top-0 w-36" /><div className="hud-line absolute right-0 bottom-0 w-48" />
        <Eyebrow>{copy("eyebrow")}</Eyebrow>
        <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div><h1 className="font-display text-4xl font-black uppercase tracking-[-0.055em] text-white sm:text-6xl">{copy("title")}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{copy("description")}</p></div>
          <WorkspaceSetupDialog />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={BoxesIcon} label={copy("activeWorkspaces")} value={String(dashboard.data?.activeWorkspaceCount ?? 0)} tone="cyan" />
        <Metric icon={ShieldAlert} label={copy("pendingApprovals")} value={String(dashboard.data?.pendingApprovalCount ?? 0)} tone="pink" />
        <Metric icon={Bot} label={copy("policyBlocks")} value={String(dashboard.data?.policyBlockCount ?? 0)} tone="orange" />
        <Metric icon={FileCheck2} label={copy("validatedFindings")} value={String(dashboard.data?.validatedFindingCount ?? 0)} tone="cyan" />
        <Metric icon={CircleDollarSign} label={copy("recordedSpend")} value={cents(dashboard.data?.estimatedSpendCents ?? 0)} tone="pink" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.32fr_.68fr]">
        <NeonFrame className="min-h-[410px] p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><Eyebrow>{copy("rehearsalEyebrow")}</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold text-white">{copy("rehearsalTitle")}</h2></div><Badge className="border border-cyan-300/30 bg-cyan-300/10 font-mono text-[10px] uppercase tracking-[.16em] text-cyan-200">{copy("dryRunOnly")}</Badge></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2"><ControlItem icon={ShieldCheck} title={copy("scopeGate")} detail={copy("scopeGateDetail")} /><ControlItem icon={Braces} title={copy("noTargetInteraction")} detail={copy("noTargetInteractionDetail")} /><ControlItem icon={Clock3} title={copy("budgetSession")} detail={copy("budgetSessionDetail")} /><ControlItem icon={Sparkles} title={copy("hypotheticalMap")} detail={copy("hypotheticalMapDetail")} /></div>
          <div className="mt-6 flex flex-col gap-3 border-t border-cyan-300/15 pt-5 sm:flex-row sm:items-center">
            <select aria-label="Select workspace for rehearsal" value={workspaceId ?? ""} onChange={event => setSelectedWorkspaceId(Number(event.target.value))} className="h-10 flex-1 rounded-sm border border-cyan-300/20 bg-[#0a0d19] px-3 text-sm text-slate-200 outline-none focus:border-cyan-300" disabled={!workspaces.data?.length}><option value="">{workspaces.data?.length ? copy("selectGuardedWorkspace") : copy("createWorkspaceToBegin")}</option>{workspaces.data?.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name} · {workspace.status}</option>)}</select>
            <Button className="neon-button min-w-44" disabled={!workspaceId || runRehearsal.isPending} onClick={() => workspaceId && runRehearsal.mutate({ workspaceId })}>{runRehearsal.isPending ? copy("rehearsing") : copy("startRehearsal")}</Button>
          </div>
          {rehearsal && <div className="mt-5 grid gap-3 border border-cyan-300/15 bg-cyan-300/[.035] p-4 sm:grid-cols-4"><DataPoint label="Tasks" value={String(rehearsal.taskCount)} /><DataPoint label="Estimate" value={cents(rehearsal.estimatedCostCents)} /><DataPoint label="Duration" value={`${rehearsal.estimatedDurationMinutes}m`} /><DataPoint label="Network / tools" value={`${rehearsal.networkCalls} / ${rehearsal.toolExecutions}`} /><p className="sm:col-span-4 font-mono text-[10px] uppercase tracking-[.14em] text-cyan-200">{rehearsal.policy.allowed ? "Policy passed: simulated plan checkpointed." : `Policy blocked: ${rehearsal.policy.reasons.join(" ")}`}</p></div>}
        </NeonFrame>
        <NeonFrame className="p-5 sm:p-6"><Eyebrow>{copy("telemetryEyebrow")}</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold text-white">{copy("coverageLens")}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{copy("coverageDescription")}</p><div className="mt-7 space-y-5"><Coverage label={copy("scopeGovernance")} value={selectedWorkspace ? 100 : 0} color="bg-cyan-300" /><Coverage label={copy("programContext")} value={selectedWorkspace ? 100 : 0} color="bg-fuchsia-400" /><Coverage label={copy("hypothesisPlanning")} value={rehearsal ? 100 : 0} color="bg-cyan-300" /><Coverage label={copy("findingValidation")} value={0} color="bg-fuchsia-400" /></div><div className="mt-7 border-t border-cyan-300/15 pt-5 font-mono text-[10px] uppercase tracking-[.15em] text-slate-500">{copy("noModelNoContact")}</div></NeonFrame>
      </div>

      <NeonFrame className="p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><Eyebrow>{copy("runLedger")}</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold text-white">{copy("latestActivity")}</h2></div><Activity className="h-5 w-5 text-cyan-300" /></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="font-mono text-[10px] uppercase tracking-[.14em] text-slate-500"><tr><th className="pb-3 font-normal">Mode</th><th className="pb-3 font-normal">Status</th><th className="pb-3 font-normal">Tier</th><th className="pb-3 font-normal">Tasks</th><th className="pb-3 font-normal">Estimate</th><th className="pb-3 font-normal">Created</th></tr></thead><tbody>{dashboard.data?.recentRuns.length ? dashboard.data.recentRuns.map(run => <tr className="border-t border-cyan-300/10" key={run.id}><td className="py-3 text-slate-300">{run.mode.replace("_", " ")}</td><td className="py-3"><StatusBadge value={run.status} /></td><td className="py-3 font-mono text-xs text-fuchsia-300">{run.governanceTier}</td><td className="py-3 text-slate-300">{run.plannedTaskCount}</td><td className="py-3 text-slate-300">{cents(run.estimatedCostCents)}</td><td className="py-3 text-slate-500">{formatDate(run.createdAt)}</td></tr>) : <tr><td colSpan={6} className="py-10 text-center text-slate-500">{copy("noActivity")}</td></tr>}</tbody></table></div></NeonFrame>
    </div>
  );
}

const BoxesIcon = ({ className }: { className?: string }) => <span className={className}>⌘</span>;
function Metric({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone: "cyan" | "pink" | "orange" }) { const tones = { cyan: "text-cyan-300 border-cyan-300/20", pink: "text-fuchsia-300 border-fuchsia-400/20", orange: "text-orange-300 border-orange-300/20" }; return <NeonFrame className="p-4"><div className="flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[.13em] text-slate-500">{label}</span><Icon className={`h-4 w-4 ${tones[tone].split(" ")[0]}`} /></div><div className="mt-4 font-display text-3xl font-black text-white">{value}</div><div className={`mt-3 h-px w-full ${tones[tone].split(" ")[1].replace("border", "bg")}`} /></NeonFrame>; }
function ControlItem({ icon: Icon, title, detail }: { icon: React.ComponentType<{ className?: string }>; title: string; detail: string }) { return <div className="border border-cyan-300/10 bg-white/[.015] p-3"><Icon className="h-4 w-4 text-fuchsia-300" /><h3 className="mt-3 text-sm font-semibold text-slate-100">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div>; }
function DataPoint({ label, value }: { label: string; value: string }) { return <div><p className="font-mono text-[9px] uppercase tracking-[.14em] text-slate-500">{label}</p><p className="mt-1 font-display text-xl font-bold text-white">{value}</p></div>; }
function Coverage({ label, value, color }: { label: string; value: number; color: string }) { return <div><div className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-[.12em]"><span className="text-slate-400">{label}</span><span className="text-slate-200">{value}%</span></div><div className="h-1.5 overflow-hidden bg-white/5"><div className={`h-full ${color} shadow-[0_0_12px_currentColor]`} style={{ width: `${value}%` }} /></div></div>; }
function StatusBadge({ value }: { value: string }) { const blocked = value === "blocked" || value === "failed"; return <span className={`inline-flex border px-2 py-1 font-mono text-[10px] uppercase tracking-[.1em] ${blocked ? "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200" : "border-cyan-300/30 bg-cyan-300/10 text-cyan-200"}`}>{value}</span>; }
