import { Eyebrow, NeonFrame } from "@/components/NeonFrame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, CircleDot, ListChecks, Network, Plus, Radar, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const sessionNextState = {
  draft: "ready",
  ready: "active",
  active: "paused",
  paused: "active",
  completed: "archived",
  archived: "archived",
} as const;

export default function ResearchWorkspace() {
  const workspaces = trpc.workspace.list.useQuery();
  const [workspaceId, setWorkspaceId] = useState<number>();
  const selectedWorkspaceId = workspaceId ?? workspaces.data?.[0]?.id;
  const sessions = trpc.research.sessions.useQuery({ workspaceId: selectedWorkspaceId! }, { enabled: Boolean(selectedWorkspaceId) });
  const [sessionId, setSessionId] = useState<number>();
  const selectedSessionId = sessionId ?? sessions.data?.[0]?.id;
  const assets = trpc.research.assets.useQuery({ sessionId: selectedSessionId! }, { enabled: Boolean(selectedSessionId) });
  const observations = trpc.research.observations.useQuery({ sessionId: selectedSessionId! }, { enabled: Boolean(selectedSessionId) });
  const hypotheses = trpc.research.hypotheses.useQuery({ sessionId: selectedSessionId! }, { enabled: Boolean(selectedSessionId) });
  const tasks = trpc.research.tasks.useQuery({ sessionId: selectedSessionId! }, { enabled: Boolean(selectedSessionId) });
  const utils = trpc.useUtils();
  const [sessionTitle, setSessionTitle] = useState("");
  const [assetValue, setAssetValue] = useState("");
  const [observationTitle, setObservationTitle] = useState("");
  const [observationContent, setObservationContent] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState("manual-review");
  const [hypothesisDescription, setHypothesisDescription] = useState("");
  const [hypothesisReason, setHypothesisReason] = useState("");

  useEffect(() => {
    if (!sessionId && sessions.data?.[0]?.id) setSessionId(sessions.data[0].id);
    if (sessionId && sessions.data && !sessions.data.some(session => session.id === sessionId)) setSessionId(sessions.data[0]?.id);
  }, [sessionId, sessions.data]);

  const invalidateResearch = () => {
    void sessions.refetch();
    void assets.refetch();
    void observations.refetch();
    void hypotheses.refetch();
    void tasks.refetch();
  };
  const createSession = trpc.research.createSession.useMutation({ onSuccess: result => { setSessionId(result.id); setSessionTitle(""); invalidateResearch(); toast.success("Research session dibuat."); }, onError: error => toast.error(error.message) });
  const transitionSession = trpc.research.transitionSession.useMutation({ onSuccess: () => { invalidateResearch(); toast.success("Session state diperbarui."); }, onError: error => toast.error(error.message) });
  const createAsset = trpc.research.createAsset.useMutation({ onSuccess: () => { setAssetValue(""); invalidateResearch(); toast.success("Asset tercatat."); }, onError: error => toast.error(error.message) });
  const createObservation = trpc.research.createObservation.useMutation({ onSuccess: () => { setObservationTitle(""); setObservationContent(""); invalidateResearch(); toast.success("Observation tercatat."); }, onError: error => toast.error(error.message) });
  const createHypothesis = trpc.research.createHypothesis.useMutation({ onSuccess: () => { setHypothesisDescription(""); setHypothesisReason(""); invalidateResearch(); toast.success("Hypothesis dibuat untuk diteliti."); }, onError: error => toast.error(error.message) });
  const createTask = trpc.research.createTask.useMutation({ onSuccess: () => { setTaskTitle(""); invalidateResearch(); toast.success("Task masuk ke queue."); }, onError: error => toast.error(error.message) });
  const transitionTask = trpc.research.transitionTask.useMutation({ onSuccess: () => { invalidateResearch(); toast.success("Task state diperbarui."); }, onError: error => toast.error(error.message) });
  const selectedSession = sessions.data?.find(session => session.id === selectedSessionId);

  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><Eyebrow>Research workspace / offline-first</Eyebrow><h1 className="mt-2 font-display text-4xl font-black uppercase tracking-[-.05em] text-white">Research <span className="neon-pink">Workspace</span></h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Pisahkan observation, hypothesis, evidence, dan finding. Semua state transition divalidasi server-side dan seluruh aktivitas dicatat sebagai metadata audit.</p></div><Button variant="outline" onClick={invalidateResearch}><RefreshCw className="mr-2 h-4 w-4" />Refresh workspace</Button></header>

    <NeonFrame className="p-5 sm:p-6"><div className="grid gap-5 lg:grid-cols-[.75fr_1fr_auto] lg:items-end"><div className="space-y-2"><Label htmlFor="research-workspace">Workspace</Label><select id="research-workspace" aria-label="Research workspace" value={selectedWorkspaceId ?? ""} onChange={event => { setWorkspaceId(Number(event.target.value)); setSessionId(undefined); }} className="h-10 w-full border border-cyan-300/20 bg-[#0a0d19] px-3 text-sm text-slate-200"><option value="">Create a workspace first</option>{workspaces.data?.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name} · {workspace.programName}</option>)}</select></div><div className="space-y-2"><Label htmlFor="session-title">New research session</Label><Input id="session-title" value={sessionTitle} onChange={event => setSessionTitle(event.target.value)} placeholder="Q3 authorized review" maxLength={200} /></div><Button disabled={!selectedWorkspaceId || sessionTitle.trim().length < 3 || createSession.isPending} onClick={() => selectedWorkspaceId && createSession.mutate({ workspaceId: selectedWorkspaceId, title: sessionTitle })}><Plus className="mr-2 h-4 w-4" />Create session</Button></div></NeonFrame>

    {sessions.data?.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{sessions.data.map(session => <button key={session.id} type="button" onClick={() => setSessionId(session.id)} className={`rounded-xl border p-4 text-left transition ${selectedSessionId === session.id ? "border-cyan-300/60 bg-cyan-300/[.08]" : "border-white/10 bg-white/[.02] hover:border-cyan-300/30"}`}><div className="flex items-center justify-between gap-3"><span className="font-mono text-[10px] uppercase tracking-[.16em] text-cyan-300">Session #{session.id}</span><Badge variant="outline" className="border-fuchsia-300/40 text-fuchsia-200">{session.state}</Badge></div><p className="mt-3 font-display text-lg font-bold text-white">{session.title}</p><p className="mt-2 text-xs text-slate-500">Scope digest {session.scopeDigest.slice(0, 12)}…</p></button>)}</div> : <NeonFrame className="grid min-h-[180px] place-items-center p-6 text-center"><Radar className="h-8 w-8 text-cyan-300/60" /><p className="mt-3 text-sm text-slate-500">Belum ada research session pada workspace ini.</p></NeonFrame>}

    {selectedSession && <><NeonFrame className="p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><Eyebrow>Session state machine</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold text-white">{selectedSession.title}</h2><p className="mt-2 text-sm text-slate-500">State saat ini: <span className="text-cyan-200">{selectedSession.state}</span>. Ready dan Active hanya dipakai setelah scope workspace tersedia.</p></div><Button variant="outline" disabled={selectedSession.state === "archived" || transitionSession.isPending} onClick={() => transitionSession.mutate({ sessionId: selectedSession.id, state: sessionNextState[selectedSession.state] })}>{selectedSession.state === "active" ? "Pause session" : selectedSession.state === "paused" ? "Resume session" : `Advance to ${sessionNextState[selectedSession.state]}`} </Button></div></NeonFrame>

      <div className="grid gap-6 xl:grid-cols-2">
        <NeonFrame className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><Eyebrow>Asset intelligence</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold text-white">{assets.data?.length ?? 0} assets</h2></div><Network className="h-5 w-5 text-cyan-300" /></div><div className="mt-5 flex gap-2"><Input value={assetValue} onChange={event => setAssetValue(event.target.value)} placeholder="api.example.test" maxLength={512} /><Button disabled={assetValue.trim().length < 1 || createAsset.isPending} onClick={() => createAsset.mutate({ sessionId: selectedSession.id, assetType: "domain", value: assetValue })}><Plus className="h-4 w-4" /></Button></div><div className="mt-4 space-y-2">{assets.data?.slice(0, 8).map(asset => <div key={asset.id} className="flex items-center justify-between rounded-lg border border-white/10 p-3"><div><p className="text-sm font-semibold text-white">{asset.value}</p><p className="mt-1 text-xs text-slate-500">{asset.assetType} · {asset.state}</p></div><Badge variant="outline" className={asset.inScope ? "border-emerald-300/40 text-emerald-200" : "border-slate-500 text-slate-400"}>{asset.inScope ? "in scope" : "out of scope"}</Badge></div>)}</div></NeonFrame>

        <NeonFrame className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><Eyebrow>Observation engine</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold text-white">{observations.data?.length ?? 0} observations</h2></div><CircleDot className="h-5 w-5 text-fuchsia-300" /></div><div className="mt-5 space-y-3"><Input value={observationTitle} onChange={event => setObservationTitle(event.target.value)} placeholder="Observation title" maxLength={240} /><Textarea value={observationContent} onChange={event => setObservationContent(event.target.value)} placeholder="Record what was observed without turning it directly into a finding…" maxLength={20_000} /><Button disabled={observationTitle.trim().length < 3 || observationContent.trim().length < 3 || createObservation.isPending} onClick={() => createObservation.mutate({ sessionId: selectedSession.id, title: observationTitle, content: observationContent })}><Plus className="mr-2 h-4 w-4" />Record observation</Button></div><div className="mt-4 space-y-2">{observations.data?.slice(0, 4).map(observation => <div key={observation.id} className="rounded-lg border border-white/10 p-3"><p className="text-sm font-semibold text-white">{observation.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{observation.content}</p></div>)}</div></NeonFrame>

        <NeonFrame className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><Eyebrow>Hypothesis engine</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold text-white">{hypotheses.data?.length ?? 0} hypotheses</h2></div><Sparkles className="h-5 w-5 text-fuchsia-300" /></div><div className="mt-5 space-y-3"><Input value={hypothesisDescription} onChange={event => setHypothesisDescription(event.target.value)} placeholder="What could explain this observation?" maxLength={20_000} /><Textarea value={hypothesisReason} onChange={event => setHypothesisReason(event.target.value)} placeholder="Reason and testable rationale…" maxLength={20_000} /><Button disabled={hypothesisDescription.trim().length < 3 || hypothesisReason.trim().length < 3 || createHypothesis.isPending} onClick={() => createHypothesis.mutate({ sessionId: selectedSession.id, description: hypothesisDescription, reason: hypothesisReason, priority: 50 })}><Plus className="mr-2 h-4 w-4" />Propose hypothesis</Button></div><div className="mt-4 space-y-2">{hypotheses.data?.slice(0, 4).map(hypothesis => <div key={hypothesis.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{hypothesis.description}</p><p className="mt-1 text-xs text-slate-500">{hypothesis.status} · priority {hypothesis.priority}</p></div><Badge variant="outline" className="border-fuchsia-300/40 text-fuchsia-200">#{hypothesis.id}</Badge></div>)}</div></NeonFrame>

        <NeonFrame className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><Eyebrow>Task engine</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold text-white">{tasks.data?.length ?? 0} tasks</h2></div><ListChecks className="h-5 w-5 text-cyan-300" /></div><div className="mt-5 grid gap-3 sm:grid-cols-[.7fr_1.3fr_auto]"><Input value={taskType} onChange={event => setTaskType(event.target.value)} placeholder="Type" maxLength={80} /><Input value={taskTitle} onChange={event => setTaskTitle(event.target.value)} placeholder="Task title" maxLength={240} /><Button disabled={taskTitle.trim().length < 3 || createTask.isPending} onClick={() => createTask.mutate({ sessionId: selectedSession.id, type: taskType, title: taskTitle, priority: 50, dependencies: [] })}><Plus className="h-4 w-4" /></Button></div><div className="mt-4 space-y-2">{tasks.data?.slice(0, 6).map(task => <div key={task.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.type} · {task.status}</p></div><Button variant="ghost" size="sm" disabled={task.status !== "queued" || transitionTask.isPending} onClick={() => transitionTask.mutate({ taskId: task.id, status: "running" })}>Run</Button></div>)}</div></NeonFrame>
      </div></>}
  </div>;
}
