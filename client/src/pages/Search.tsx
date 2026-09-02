import { Eyebrow, NeonFrame } from "@/components/NeonFrame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CheckCircle2, ChevronLeft, Clock3, Database, ExternalLink, Loader2, RefreshCw, Search as SearchIcon, SearchX, SlidersHorizontal } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

const typeLabels: Record<string, string> = { finding: "Findings", asset: "Assets", session: "Sessions", report: "Reports", program: "Programs", knowledge_node: "Knowledge", observation: "Observations", hypothesis: "Hypotheses", task: "Tasks", evidence: "Evidence", intelligence: "Intelligence", note: "Notes", ai_memory: "AI memory" };
const typeRoutes: Record<string, string> = { finding: "/findings", asset: "/inventory", session: "/research", report: "/reports", knowledge_node: "/knowledge", observation: "/research", hypothesis: "/research", task: "/research", evidence: "/research", intelligence: "/coverage", note: "/tags-notes", ai_memory: "/ai-center", program: "/workspaces" };
const freshnessOptions = [{ value: "", label: "Any age" }, { value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "365", label: "Last year" }];

function updateSearchUrl(values: { query: string; workspaceId?: number; entityType: string; freshnessDays: string }) {
  const params = new URLSearchParams();
  if (values.query) params.set("q", values.query);
  if (values.workspaceId) params.set("workspace", String(values.workspaceId));
  if (values.entityType) params.set("type", values.entityType);
  if (values.freshnessDays) params.set("freshness", values.freshnessDays);
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
  window.history.replaceState({}, "", next);
}

export default function Search() {
  const workspaces = trpc.workspace.list.useQuery();
  const [workspaceId, setWorkspaceId] = useState<number>();
  const selectedWorkspaceId = workspaceId ?? workspaces.data?.[0]?.id;
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [entityType, setEntityType] = useState("");
  const [freshnessDays, setFreshnessDays] = useState("");
  const [cursor, setCursor] = useState<string>();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("q") ?? "";
    const initialWorkspace = Number(params.get("workspace"));
    const initialType = params.get("type") ?? "";
    const initialFreshness = params.get("freshness") ?? "";
    setDraft(initialQuery);
    setQuery(initialQuery);
    setEntityType(initialType);
    setFreshnessDays(freshnessOptions.some(option => option.value === initialFreshness) ? initialFreshness : "");
    if (Number.isInteger(initialWorkspace) && initialWorkspace > 0) setWorkspaceId(initialWorkspace);
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized) updateSearchUrl({ query, workspaceId: selectedWorkspaceId, entityType, freshnessDays });
  }, [initialized, query, selectedWorkspaceId, entityType, freshnessDays]);

  const searchInput = { workspaceId: selectedWorkspaceId!, query, limit: 24, cursor, entityTypes: entityType ? [entityType] : undefined, freshnessDays: freshnessDays ? Number(freshnessDays) : undefined };
  const search = trpc.search.global.useQuery(searchInput, { enabled: initialized && Boolean(selectedWorkspaceId && query.length >= 2), placeholderData: previous => previous, retry: 1 });
  const facets = useMemo(() => Object.entries(search.data?.facets ?? {}).sort((a, b) => b[1] - a[1]), [search.data?.facets]);
  const hasSearch = query.length >= 2;
  const hasWorkspaces = Boolean(workspaces.data?.length);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setCursor(undefined);
    setQuery(draft.trim());
  };
  const reset = () => {
    setDraft("");
    setQuery("");
    setCursor(undefined);
    setEntityType("");
    setFreshnessDays("");
  };
  const selectWorkspace = (value: string) => {
    setWorkspaceId(value ? Number(value) : undefined);
    setCursor(undefined);
  };

  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div><Eyebrow>Unified intelligence layer / semantic retrieval</Eyebrow><h1 className="mt-2 font-display text-4xl font-black uppercase tracking-[-.05em] text-white">Global <span className="neon-pink">Search</span></h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Satu interface untuk menemukan findings, assets, evidence, reports, knowledge, notes, dan AI memory dalam workspace yang terisolasi.</p></div>
      <Link href="/saved-views" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-cyan-200 transition hover:text-white"><ExternalLink className="h-3.5 w-3.5" />Saved views</Link>
    </header>

    <NeonFrame className="p-5 sm:p-6">
      <form onSubmit={submit} className="flex flex-col gap-3 lg:flex-row">
        <div className="relative min-w-0 flex-1"><SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300" /><Input aria-label="Search workspace" className="h-11 pl-9" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Search evidence, finding, hostname, hypothesis…" maxLength={120} /></div>
        <Button type="submit" className="h-11" disabled={!selectedWorkspaceId || draft.trim().length < 2 || search.isFetching}><SearchIcon className="mr-2 h-4 w-4" />Search</Button>
      </form>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="space-y-1.5 text-xs text-slate-400"><span className="font-medium uppercase tracking-[.12em]">Workspace</span><select aria-label="Workspace" value={selectedWorkspaceId ?? ""} onChange={event => selectWorkspace(event.target.value)} className="h-10 w-full border border-cyan-300/20 bg-[#0a0d19] px-3 text-sm text-slate-200 outline-none focus:border-cyan-300/60"><option value="">Select workspace</option>{workspaces.data?.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label>
        <label className="space-y-1.5 text-xs text-slate-400"><span className="font-medium uppercase tracking-[.12em]">Domain</span><select aria-label="Entity type filter" value={entityType} onChange={event => { setEntityType(event.target.value); setCursor(undefined); }} className="h-10 w-full border border-white/10 bg-[#0a0d19] px-3 text-sm text-slate-200 outline-none focus:border-cyan-300/60"><option value="">All domains</option>{facets.map(([type]) => <option key={type} value={type}>{typeLabels[type] ?? type}</option>)}</select></label>
        <label className="space-y-1.5 text-xs text-slate-400"><span className="font-medium uppercase tracking-[.12em]">Freshness</span><select aria-label="Freshness filter" value={freshnessDays} onChange={event => { setFreshnessDays(event.target.value); setCursor(undefined); }} className="h-10 w-full border border-white/10 bg-[#0a0d19] px-3 text-sm text-slate-200 outline-none focus:border-cyan-300/60">{freshnessOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-slate-500"><span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-3.5 w-3.5 text-cyan-300" />Exact, token, semantic vector, and freshness ranking</span>{query && <Button type="button" variant="ghost" size="sm" onClick={reset}>Clear search</Button>}</div>
    </NeonFrame>

    {workspaces.isLoading ? <NeonFrame className="p-12 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-cyan-300" /><p className="mt-3 text-sm text-slate-400">Loading accessible workspaces…</p></NeonFrame> : workspaces.isError ? <NeonFrame className="p-8 text-center"><SearchX className="mx-auto h-8 w-8 text-rose-300" /><p className="mt-3 text-sm text-rose-200">Workspace list could not be loaded.</p><Button className="mt-4" variant="outline" onClick={() => void workspaces.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></NeonFrame> : !hasWorkspaces ? <NeonFrame className="p-12 text-center"><Database className="mx-auto h-8 w-8 text-amber-300" /><p className="mt-3 text-sm text-slate-300">Belum ada workspace yang dapat dicari.</p><Link href="/workspaces" className="mt-4 inline-block text-sm text-cyan-200 hover:text-white">Create a workspace <ArrowRight className="inline h-4 w-4" /></Link></NeonFrame> : !hasSearch ? <NeonFrame className="p-12 text-center"><SearchIcon className="mx-auto h-8 w-8 text-cyan-300/50" /><p className="mt-4 text-sm text-slate-400">Masukkan minimal dua karakter untuk memulai pencarian workspace.</p></NeonFrame> : search.isLoading ? <NeonFrame className="p-12 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-cyan-300" /><p className="mt-3 text-sm text-slate-400">Searching across accessible domains…</p></NeonFrame> : search.isError ? <NeonFrame className="p-8 text-center"><SearchX className="mx-auto h-8 w-8 text-rose-300" /><p className="mt-3 text-sm text-rose-200">Search failed: {search.error.message}</p><Button className="mt-4" variant="outline" onClick={() => void search.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Retry search</Button></NeonFrame> : <NeonFrame className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-start lg:justify-between"><div><Eyebrow>Search results</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold text-white">{search.data?.results.length ?? 0} results <span className="text-slate-500">for “{query}”</span></h2><p className="mt-2 inline-flex items-center gap-2 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />{freshnessDays ? `Updated within ${freshnessDays} days` : "All indexed workspace history"}</p></div><div className="flex flex-wrap gap-2">{facets.map(([type, count]) => <Badge key={type} variant="outline" className="border-cyan-300/30 text-cyan-200">{typeLabels[type] ?? type}: {count}</Badge>)}</div></div>
      <div className="mt-5 space-y-3">{search.data?.results.map(result => <Link key={`${result.entityType}-${result.id}`} href={`${typeRoutes[result.entityType] ?? "/"}?id=${result.id}`} className="block rounded-lg border border-white/10 p-4 transition hover:border-cyan-300/40 hover:bg-cyan-300/[.04] focus:outline-none focus:ring-2 focus:ring-cyan-300/60"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold text-white">{result.title || "Untitled"}</h3><Badge variant="outline" className="border-fuchsia-300/30 text-fuchsia-200">{typeLabels[result.entityType] ?? result.entityType}</Badge></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{result.body || "No additional context"}</p><p className="mt-3 text-[11px] text-slate-600">Updated {new Date(result.updatedAt).toLocaleString()}</p></div><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-cyan-300" /></div></Link>)}{!search.data?.results.length && <div className="py-12 text-center"><SearchX className="mx-auto h-8 w-8 text-slate-600" /><p className="mt-4 text-sm text-slate-500">Tidak ada hasil yang dapat diakses pada workspace ini.</p><p className="mt-2 text-xs text-slate-600">Coba istilah yang lebih umum atau hapus filter domain/freshness.</p></div>}</div>
      {search.data?.results.length ? <div className="mt-5 flex justify-between border-t border-white/10 pt-4"><Button variant="outline" disabled={!cursor} onClick={() => setCursor(undefined)}><ChevronLeft className="mr-2 h-4 w-4" />First page</Button><Button variant="outline" disabled={!search.data.hasNextPage || !search.data.nextCursor} onClick={() => setCursor(search.data?.nextCursor ?? undefined)}>Next page<ArrowRight className="ml-2 h-4 w-4" /></Button></div> : null}
    </NeonFrame>}

    {hasSearch && search.data && <div className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[.14em] text-slate-600"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />Permission-scoped results only</div>}
  </div>;
}
