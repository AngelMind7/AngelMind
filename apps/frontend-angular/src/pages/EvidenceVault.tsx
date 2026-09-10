import { Eyebrow, NeonFrame } from "@/components/NeonFrame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Database, FileCheck2, GitBranch, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

export default function EvidenceVault() {
  const workspaces = trpc.workspace.list.useQuery();
  const [workspaceId, setWorkspaceId] = useState<number>();
  const selectedWorkspaceId = workspaceId ?? workspaces.data?.[0]?.id;
  const [selectedId, setSelectedId] = useState<number>();
  const [sourceType, setSourceType] = useState("research-source");
  const [sourceReference, setSourceReference] = useState("");
  const evidence = trpc.evidence.list.useQuery({ workspaceId: selectedWorkspaceId! }, { enabled: Boolean(selectedWorkspaceId) });
  const lineage = trpc.evidence.lineage.useQuery({ evidenceArtifactId: selectedId! }, { enabled: Boolean(selectedId) });
  const utils = trpc.useUtils();
  const provenance = trpc.evidence.recordProvenance.useMutation({
    onSuccess: () => {
      setSourceReference("");
      void utils.evidence.list.invalidate();
      void utils.evidence.lineage.invalidate();
    },
  });

  useEffect(() => {
    if (!selectedId && evidence.data?.[0]?.id) setSelectedId(evidence.data[0].id);
    if (selectedId && evidence.data && !evidence.data.some(item => item.id === selectedId)) setSelectedId(evidence.data[0]?.id);
  }, [evidence.data, selectedId]);

  const submitProvenance = () => {
    if (!selectedId || sourceReference.trim().length < 2) return;
    provenance.mutate({ evidenceArtifactId: selectedId, sourceType, sourceReference: sourceReference.trim(), capturedAt: new Date() });
  };

  return <div className="mx-auto max-w-7xl space-y-6">
    <header>
      <Eyebrow>Integrity-aware evidence vault</Eyebrow>
      <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-[-.05em] text-white">Evidence <span className="neon-pink">Vault</span></h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Inspect workspace-scoped artifacts, provenance, hashes, and lineage without exposing storage credentials or bypassing evidence authorization.</p>
    </header>

    <NeonFrame className="p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="grid gap-2 text-xs uppercase tracking-[.12em] text-slate-400">Workspace
          <select aria-label="Evidence workspace" value={selectedWorkspaceId ?? ""} onChange={event => { setWorkspaceId(Number(event.target.value)); setSelectedId(undefined); }} className="h-10 min-w-64 border border-cyan-300/20 bg-[#0a0d19] px-3 text-sm normal-case tracking-normal text-slate-200"><option value="">Select workspace</option>{workspaces.data?.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select>
        </label>
        <Button variant="outline" onClick={() => void evidence.refetch()} disabled={evidence.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${evidence.isFetching ? "animate-spin" : ""}`} />Refresh vault</Button>
      </div>
    </NeonFrame>

    {!selectedWorkspaceId ? <NeonFrame className="p-12 text-center"><Database className="mx-auto h-8 w-8 text-amber-300" /><p className="mt-4 text-sm text-slate-400">Create or select a workspace to inspect evidence.</p></NeonFrame> : evidence.isLoading ? <NeonFrame className="p-12 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-cyan-300" /><p className="mt-3 text-sm text-slate-400">Loading evidence vault…</p></NeonFrame> : evidence.isError ? <NeonFrame className="p-8 text-center"><p className="text-sm text-rose-200">Evidence could not be loaded: {evidence.error.message}</p><Button className="mt-4" variant="outline" onClick={() => void evidence.refetch()}>Retry</Button></NeonFrame> : <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <NeonFrame className="p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><Eyebrow>Artifacts</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold text-white">Quarantine-aware records</h2></div><Badge variant="outline" className="border-cyan-300/30 text-cyan-200">{evidence.data?.length ?? 0} records</Badge></div><div className="mt-5 space-y-3">{evidence.data?.map(item => <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full rounded-lg border p-4 text-left transition ${selectedId === item.id ? "border-cyan-300/60 bg-cyan-300/[.06]" : "border-white/10 hover:border-cyan-300/30"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">#{item.id} · {item.artifactType}</p><p className="mt-1 truncate text-xs text-slate-500">{item.storageReference}</p></div><Badge variant="outline" className="shrink-0 border-emerald-300/30 text-emerald-200">{item.sha256.slice(0, 12)}…</Badge></div><div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500"><span>{item.findingId ? `Finding #${item.findingId}` : "Unlinked"}</span><span>·</span><span>{item.provenanceId ? `Provenance: ${item.sourceType}` : "Provenance pending"}</span></div></button>)}{!evidence.data?.length && <div className="py-12 text-center text-sm text-slate-500">No evidence artifacts are available in this workspace.</div>}</div></NeonFrame>
      <div className="space-y-6"><NeonFrame className="p-5 sm:p-6"><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-emerald-300" /><div><Eyebrow>Provenance capture</Eyebrow><h2 className="mt-2 font-display text-xl font-bold text-white">Record source context</h2></div></div><p className="mt-3 text-xs leading-5 text-slate-500">Selected artifact: {selectedId ? `#${selectedId}` : "none"}. Source references are bounded and become part of the audit lineage.</p><div className="mt-4 grid gap-3"><Input aria-label="Provenance source type" value={sourceType} onChange={event => setSourceType(event.target.value)} placeholder="Source type" maxLength={64} /><Input aria-label="Provenance source reference" value={sourceReference} onChange={event => setSourceReference(event.target.value)} placeholder="Source reference or capture ID" maxLength={512} /><Button onClick={submitProvenance} disabled={!selectedId || sourceReference.trim().length < 2 || provenance.isPending}>{provenance.isPending ? "Saving…" : "Save provenance"}</Button>{provenance.isError && <p role="alert" className="text-xs text-rose-300">{provenance.error.message}</p>}</div></NeonFrame><NeonFrame className="p-5 sm:p-6"><div className="flex items-center gap-3"><GitBranch className="h-5 w-5 text-fuchsia-300" /><div><Eyebrow>Evidence lineage</Eyebrow><h2 className="mt-2 font-display text-xl font-bold text-white">Traceable links</h2></div></div><div className="mt-4 space-y-2">{lineage.isLoading ? <p className="text-xs text-slate-500">Loading lineage…</p> : lineage.data?.length ? lineage.data.map(edge => <div className="rounded border border-white/10 p-3" key={edge.id}><p className="text-xs font-semibold text-white">{edge.sourceNodeType} #{edge.sourceNodeId} <span className="text-cyan-300">→ {edge.targetNodeType} #{edge.targetNodeId}</span></p><p className="mt-1 text-[11px] text-slate-500">{edge.relationType}</p></div>) : <p className="text-xs text-slate-500">No lineage recorded for the selected artifact.</p>}</div></NeonFrame></div>
    </div>}
  </div>;
}
