import { Eyebrow, NeonFrame } from "@/components/NeonFrame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Activity, BookOpen, Loader2, Play, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";

function csv(value: string) { return value.split(",").map(item => item.trim()).filter(Boolean); }

export default function Playbooks() {
  const workspaces = trpc.workspace.list.useQuery();
  const [workspaceId, setWorkspaceId] = useState<number>();
  const selectedWorkspaceId = workspaceId ?? workspaces.data?.[0]?.id;
  const sessions = trpc.research.sessions.useQuery({ workspaceId: selectedWorkspaceId! }, { enabled: Boolean(selectedWorkspaceId) });
  const playbooks = trpc.research.playbooks.useQuery({ workspaceId: selectedWorkspaceId! }, { enabled: Boolean(selectedWorkspaceId) });
  const runs = trpc.research.playbookRuns.useQuery({ workspaceId: selectedWorkspaceId! }, { enabled: Boolean(selectedWorkspaceId) });
  const utils = trpc.useUtils();
  const [slug, setSlug] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [domains, setDomains] = useState("web, cloud");
  const [assetTypes, setAssetTypes] = useState("domain, service");
  const [templates, setTemplates] = useState('[{"title":"Passive inventory review","type":"passive_inventory","inputs":{"adapterKey":"inventory.snapshot"}}]');
  const create = trpc.research.createPlaybook.useMutation({ onSuccess: () => { setSlug(""); void utils.research.playbooks.invalidate(); } });
  const run = trpc.research.runPlaybook.useMutation({ onSuccess: () => { void utils.research.playbookRuns.invalidate(); } });
  const transition = trpc.research.transitionPlaybookRun.useMutation({ onSuccess: () => void utils.research.playbookRuns.invalidate() });

  const createNew = () => {
    try {
      const parsed = JSON.parse(templates) as unknown;
      if (!Array.isArray(parsed)) throw new Error("Task templates must be a JSON array.");
      if (!selectedWorkspaceId || !slug.trim()) return;
      create.mutate({ workspaceId: selectedWorkspaceId, slug: slug.trim(), version: version.trim(), status: "draft", domains: csv(domains), assetTypes: csv(assetTypes), taskTemplates: parsed });
    } catch (error) { create.reset(); window.alert(error instanceof Error ? error.message : "Invalid task template JSON."); }
  };
  const startRun = (playbookId: number) => {
    const sessionId = sessions.data?.[0]?.id;
    if (selectedWorkspaceId && sessionId) run.mutate({ workspaceId: selectedWorkspaceId, sessionId, playbookId });
  };
  const refresh = () => { void playbooks.refetch(); void runs.refetch(); };

  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><Eyebrow>Governed passive workflow automation</Eyebrow><h1 className="mt-2 font-display text-4xl font-black uppercase tracking-[-.05em] text-white">Playbook <span className="neon-pink">Control</span></h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Versioned task templates generate durable, dependency-aware runs. Execution remains passive-only and pauses closed when no approved adapter is available.</p></div><Button variant="outline" onClick={refresh} disabled={playbooks.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${playbooks.isFetching ? "animate-spin" : ""}`} />Refresh</Button></header>
    <NeonFrame className="p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><label className="grid gap-2 text-xs uppercase tracking-[.12em] text-slate-400">Workspace<select aria-label="Playbook workspace" value={selectedWorkspaceId ?? ""} onChange={event => setWorkspaceId(Number(event.target.value))} className="h-10 min-w-64 border border-cyan-300/20 bg-[#0a0d19] px-3 text-sm normal-case tracking-normal text-slate-200"><option value="">Select workspace</option>{workspaces.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-300" />Passive-only guard enforced server-side</div></div></NeonFrame>
    {selectedWorkspaceId ? <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]"><div className="space-y-6"><NeonFrame className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><Eyebrow>Versioned registry</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold text-white">Available playbooks</h2></div><Badge variant="outline" className="border-cyan-300/30 text-cyan-200">{playbooks.data?.length ?? 0} definitions</Badge></div><div className="mt-5 space-y-3">{playbooks.isLoading ? <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-cyan-300" /> : playbooks.data?.map(item => <div key={item.id} className="rounded-lg border border-white/10 bg-white/[.02] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">{item.slug} <span className="font-mono text-xs text-cyan-300">v{item.version}</span></p><p className="mt-1 text-xs text-slate-500">{item.status} · {JSON.parse(item.taskTemplates).length} task templates · {JSON.parse(item.domains).join(", ")}</p></div><Badge variant="outline" className={item.status === "active" ? "border-emerald-300/40 text-emerald-200" : "border-amber-300/40 text-amber-200"}>{item.status}</Badge></div><Button size="sm" className="mt-4" disabled={item.status !== "active" || !sessions.data?.length || run.isPending} onClick={() => startRun(item.id)}><Play className="mr-2 h-3.5 w-3.5" />Run on latest session</Button>{item.status !== "active" && <p className="mt-2 text-[11px] text-slate-600">Only active versions can generate runs.</p>}</div>)}{!playbooks.isLoading && !playbooks.data?.length && <div className="py-10 text-center text-sm text-slate-500">No playbooks registered for this workspace.</div>}</div></NeonFrame><NeonFrame className="p-5 sm:p-6"><div className="flex items-center gap-3"><Activity className="h-5 w-5 text-fuchsia-300" /><div><Eyebrow>Durable execution</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold text-white">Run ledger</h2></div></div><div className="mt-5 space-y-3">{runs.data?.map(item => <div key={item.id} className="rounded-lg border border-white/10 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-white">Run #{item.id} · playbook #{item.playbookId}</p><p className="mt-1 text-xs text-slate-500">session #{item.sessionId} · retry {item.retryCount} · {item.status}</p>{item.lastError && <p className="mt-2 text-xs text-rose-300">{item.lastError}</p>}</div><Badge variant="outline" className={item.status === "completed" ? "border-emerald-300/40 text-emerald-200" : item.status === "paused" ? "border-amber-300/40 text-amber-200" : "border-cyan-300/30 text-cyan-200"}>{item.status}</Badge></div>{["paused", "failed"].includes(item.status) && <Button size="sm" variant="outline" className="mt-3" disabled={transition.isPending} onClick={() => transition.mutate({ workspaceId: selectedWorkspaceId, runId: item.id, status: "queued" })}>Resume queued</Button>}</div>)}{!runs.data?.length && <p className="py-8 text-center text-sm text-slate-500">No runs yet.</p>}</div></NeonFrame></div><NeonFrame className="p-5 sm:p-6"><div className="flex items-center gap-3"><Plus className="h-5 w-5 text-cyan-300" /><div><Eyebrow>Registry authoring</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold text-white">Create draft</h2></div></div><div className="mt-5 grid gap-3"><Input aria-label="Playbook slug" value={slug} onChange={event => setSlug(event.target.value)} placeholder="playbook slug" maxLength={160} /><Input aria-label="Playbook version" value={version} onChange={event => setVersion(event.target.value)} placeholder="version" maxLength={40} /><Input aria-label="Playbook domains" value={domains} onChange={event => setDomains(event.target.value)} placeholder="domains, comma separated" /><Input aria-label="Playbook asset types" value={assetTypes} onChange={event => setAssetTypes(event.target.value)} placeholder="asset types, comma separated" /><textarea aria-label="Playbook task templates" value={templates} onChange={event => setTemplates(event.target.value)} className="min-h-36 border border-white/10 bg-[#0a0d19] p-3 font-mono text-xs text-slate-200 outline-none focus:border-cyan-300/60" /><Button onClick={createNew} disabled={!slug.trim() || create.isPending}>{create.isPending ? "Creating…" : "Create draft playbook"}</Button>{create.isError && <p role="alert" className="text-xs text-rose-300">{create.error.message}</p>}<p className="text-[11px] leading-5 text-slate-600">Drafts are visible for review. Activating a playbook remains a governed server-side operation; this form cannot activate or execute target-facing tasks.</p></div></NeonFrame></div> : <NeonFrame className="p-12 text-center"><BookOpen className="mx-auto h-8 w-8 text-amber-300" /><p className="mt-4 text-sm text-slate-400">Select a workspace to manage playbooks.</p></NeonFrame>}
  </div>;
}
