import { useState } from "react";
import { Trash2, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NeonFrame, Eyebrow } from "@/components/NeonFrame";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function SavedViews() {
  const workspaces = trpc.workspace.list.useQuery();
  const [workspaceId, setWorkspaceId] = useState("");
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState("{}");
  const selectedWorkspaceId = Number(workspaceId);
  const views = trpc.search.savedViews.useQuery({ workspaceId: selectedWorkspaceId }, { enabled: selectedWorkspaceId > 0 });
  const utils = trpc.useUtils();
  const save = trpc.search.saveView.useMutation({ onSuccess: () => { utils.search.savedViews.invalidate({ workspaceId: selectedWorkspaceId }); setName(""); toast.success("Saved view stored."); }, onError: error => toast.error(error.message) });
  const remove = trpc.search.deleteView.useMutation({ onSuccess: () => { utils.search.savedViews.invalidate({ workspaceId: selectedWorkspaceId }); toast.success("Saved view deleted."); }, onError: error => toast.error(error.message) });
  const submit = (event: React.FormEvent) => { event.preventDefault(); try { const parsed = JSON.parse(filters || "{}"); if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("Filters must be a JSON object."); save.mutate({ workspaceId: selectedWorkspaceId, name, query, filters: parsed }); } catch (error) { toast.error(error instanceof Error ? error.message : "Filters must be valid JSON."); } };
  return <div className="mx-auto max-w-6xl space-y-6"><header><Eyebrow>Search persistence</Eyebrow><h1 className="mt-2 font-display text-4xl font-black uppercase tracking-[-.05em] text-white">Saved <span className="neon-pink">Views</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Store workspace-scoped search queries and structured filters for repeatable review. Views never cross workspace or user boundaries.</p></header><NeonFrame className="p-5 sm:p-6"><div className="grid gap-4 lg:grid-cols-[1fr_1fr]"><form className="space-y-4" onSubmit={submit}><label className="block text-xs text-slate-400">Workspace<select required value={workspaceId} onChange={event => setWorkspaceId(event.target.value)} className="mt-2 h-10 w-full border border-cyan-300/20 px-3 text-sm"><option value="">Select workspace</option>{workspaces.data?.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label><Input required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="View name" /><Input maxLength={512} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search query" /><Textarea value={filters} onChange={event => setFilters(event.target.value)} className="min-h-28 font-mono text-xs" placeholder='{"status":"validated","severity":"high"}' /><Button className="neon-button" type="submit" disabled={selectedWorkspaceId <= 0 || save.isPending}><Bookmark className="mr-2 h-4 w-4" />{save.isPending ? "Saving…" : "Save view"}</Button></form><div className="space-y-3"><Eyebrow>Stored in selected workspace</Eyebrow>{views.data?.length ? views.data.map(view => <div className="border border-cyan-300/10 p-4" key={view.id}><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-lg font-bold text-white">{view.name}</h2><p className="mt-1 text-sm text-cyan-100">{view.query || "All indexed records"}</p><pre className="mt-2 whitespace-pre-wrap text-xs text-slate-400">{view.filters}</pre></div><Button size="icon" variant="ghost" aria-label={`Delete ${view.name}`} onClick={() => remove.mutate({ savedViewId: view.id })}><Trash2 className="h-4 w-4 text-fuchsia-300" /></Button></div></div>) : <p className="py-10 text-center text-sm text-slate-500">Select a workspace to see saved views.</p>}</div></div></NeonFrame></div>;
}
