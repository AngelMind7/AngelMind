import { Archive, Brain, Pencil, Save, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, NeonFrame } from "@/components/NeonFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

type Scope = "user" | "workspace" | "session" | "program";

type MemoryRecord = {
  id: number;
  scope: Scope;
  memoryKey: string;
  content: string;
  sourceReference: string | null;
  retentionUntil: Date;
  revision: number;
};

export function AIMemoryPanel({ workspaceId }: { workspaceId: number | undefined }) {
  const utils = trpc.useUtils();
  const workspaceMemories = trpc.ai.memories.useQuery({ workspaceId }, { enabled: Boolean(workspaceId) });
  const userMemories = trpc.ai.memories.useQuery({ scope: "user" });
  const [scope, setScope] = useState<Scope>("workspace");
  const [memoryKey, setMemoryKey] = useState("");
  const [content, setContent] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [retentionDays, setRetentionDays] = useState("90");
  const [sessionId, setSessionId] = useState("");
  const [programId, setProgramId] = useState("");
  const [editing, setEditing] = useState<MemoryRecord | null>(null);
  const save = trpc.ai.saveMemory.useMutation({
    onSuccess: async () => {
      await Promise.all([workspaceMemories.refetch(), userMemories.refetch()]);
      resetForm();
      toast.success("AI memory tersimpan dengan scope dan retention policy.");
    },
    onError: error => toast.error(error.message),
  });
  const archive = trpc.ai.archiveMemory.useMutation({
    onSuccess: async () => {
      await Promise.all([workspaceMemories.refetch(), userMemories.refetch()]);
      toast.success("AI memory diarsipkan.");
    },
    onError: error => toast.error(error.message),
  });

  function resetForm() {
    setEditing(null);
    setMemoryKey("");
    setContent("");
    setSourceReference("");
    setRetentionDays("90");
    setSessionId("");
    setProgramId("");
  }

  function edit(memory: MemoryRecord) {
    setEditing(memory);
    setScope(memory.scope);
    setMemoryKey(memory.memoryKey);
    setContent(memory.content);
    setSourceReference(memory.sourceReference ?? "");
    setRetentionDays(String(Math.max(1, Math.ceil((memory.retentionUntil.getTime() - Date.now()) / 86_400_000))));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const workspaceScoped = scope !== "user";
    save.mutate({
      scope,
      workspaceId: workspaceScoped ? workspaceId : undefined,
      sessionId: scope === "session" && sessionId ? Number(sessionId) : undefined,
      programId: scope === "program" && programId ? Number(programId) : undefined,
      memoryKey,
      content,
      sourceReference: sourceReference.trim() || null,
      retentionDays: Number(retentionDays),
      expectedRevision: editing?.revision ?? 0,
    });
  }

  const memories = [...(workspaceMemories.data ?? []), ...(userMemories.data ?? [])] as MemoryRecord[];
  return <NeonFrame className="p-5 sm:p-6 lg:col-span-3">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><Eyebrow>AI memory / governed context</Eyebrow><h2 className="mt-2 flex items-center gap-2 font-display text-2xl font-bold text-white"><Brain className="h-5 w-5 text-cyan-300" />Scoped memory</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Simpan konteks yang dapat dipakai ulang tanpa mencampur data antar-user atau antar-workspace. Memory aktif otomatis masuk retention policy dan dapat diarsipkan oleh pembuat atau owner workspace.</p></div>{editing && <Button variant="ghost" size="sm" onClick={resetForm}><X className="mr-2 h-4 w-4" />Cancel edit</Button>}</div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.3fr]">
      <form className="grid gap-3 rounded-lg border border-cyan-300/10 p-4" onSubmit={submit}>
        <div className="grid gap-2"><Label htmlFor="memory-scope">Scope</Label><select id="memory-scope" value={scope} onChange={event => setScope(event.target.value as Scope)} className="h-10 border border-cyan-300/20 bg-[#0a0d19] px-3 text-sm text-slate-200"><option value="user">User private</option><option value="workspace">Workspace</option><option value="session">Research session</option><option value="program">Program</option></select></div>
        {scope !== "user" && <p className="text-xs text-slate-500">Workspace: <span className="text-cyan-200">#{workspaceId ?? "pilih workspace"}</span></p>}
        {scope === "session" && <Input type="number" min="1" value={sessionId} onChange={event => setSessionId(event.target.value)} placeholder="Research session ID" required />}
        {scope === "program" && <Input type="number" min="1" value={programId} onChange={event => setProgramId(event.target.value)} placeholder="Program ID yang terhubung" required />}
        <Input value={memoryKey} onChange={event => setMemoryKey(event.target.value)} placeholder="Memory key, mis. preferred-analysis-style" minLength={2} maxLength={160} required />
        <Textarea value={content} onChange={event => setContent(event.target.value)} placeholder="Context yang aman dan bounded untuk dipakai ulang" minLength={2} maxLength={100_000} required />
        <Input value={sourceReference} onChange={event => setSourceReference(event.target.value)} placeholder="Optional source reference" maxLength={512} />
        <Input type="number" min="1" max="3650" value={retentionDays} onChange={event => setRetentionDays(event.target.value)} placeholder="Retention days" required />
        <Button type="submit" disabled={save.isPending || (scope !== "user" && !workspaceId)}><Save className="mr-2 h-4 w-4" />{editing ? "Update memory" : "Save memory"}</Button>
      </form>
      <div className="space-y-2">
        {memories.length ? memories.map(memory => <div className="rounded-lg border border-white/10 p-3" key={`${memory.scope}-${memory.id}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-cyan-300/30 text-cyan-200">{memory.scope}</Badge><p className="truncate text-sm font-semibold text-white">{memory.memoryKey}</p></div><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-300">{memory.content}</p><p className="mt-2 text-[10px] uppercase tracking-[.12em] text-slate-500">Retention sampai {memory.retentionUntil.toLocaleDateString()} · revision {memory.revision}</p></div><div className="flex shrink-0 gap-1"><Button aria-label={`Edit ${memory.memoryKey}`} variant="ghost" size="icon" onClick={() => edit(memory)}><Pencil className="h-4 w-4" /></Button><Button aria-label={`Archive ${memory.memoryKey}`} variant="ghost" size="icon" disabled={archive.isPending} onClick={() => archive.mutate({ memoryId: memory.id, expectedRevision: memory.revision })}><Archive className="h-4 w-4 text-fuchsia-300" /></Button></div></div></div>) : <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">Belum ada AI memory aktif pada scope yang dapat kamu akses.</div>}
      </div>
    </div>
  </NeonFrame>;
}

