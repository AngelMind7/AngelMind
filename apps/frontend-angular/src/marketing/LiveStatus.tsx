import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RefreshCw, TriangleAlert } from "lucide-react";

type ComponentStatus = "operational" | "degraded";
type StatusPayload = {
  status: ComponentStatus;
  updatedAt: string;
  components: Record<string, { status: ComponentStatus }>;
  publicPosture: string;
};

const labels: Record<string, string> = { api: "Control plane API", runtime: "Passive runtime", providers: "Configured providers" };

export default function LiveStatus() {
  const [state, setState] = useState<{ loading: boolean; error?: string; data?: StatusPayload }>({ loading: true });
  const load = async () => {
    setState({ loading: true });
    try {
      const response = await fetch("/statusz", { headers: { accept: "application/json" }, credentials: "omit" });
      const payload = await response.json() as StatusPayload;
      if (!response.ok && !payload) throw new Error(`Status unavailable (${response.status})`);
      setState({ loading: false, data: payload });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : "Status unavailable" });
    }
  };
  useEffect(() => { void load(); }, []);

  if (state.loading) return <div className="mt-8 border border-cyan-300/20 bg-cyan-300/5 p-5 text-sm text-slate-300">Checking live component status…</div>;
  if (state.error || !state.data) return <div className="mt-8 border border-rose-300/30 bg-rose-300/5 p-5"><p className="flex items-center gap-2 text-sm text-rose-200"><TriangleAlert className="h-4 w-4" />{state.error ?? "Status unavailable"}</p><Button variant="outline" size="sm" className="mt-4" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></div>;

  const healthy = state.data.status === "operational";
  return <div className="mt-8 border border-cyan-300/20 bg-[#0b1020]/80 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><CheckCircle2 className={`h-4 w-4 ${healthy ? "text-emerald-300" : "text-amber-300"}`} /><span className="text-sm font-semibold text-white">Live component status</span></div><Badge variant="outline" className={healthy ? "border-emerald-300/30 text-emerald-200" : "border-amber-300/30 text-amber-200"}>{state.data.status}</Badge></div><div className="mt-4 grid gap-2 sm:grid-cols-3">{Object.entries(state.data.components).map(([key, component]) => <div key={key} className="flex items-center justify-between border border-white/10 px-3 py-2 text-xs"><span className="text-slate-400">{labels[key] ?? key}</span><span className={component.status === "operational" ? "text-emerald-200" : "text-amber-200"}>{component.status}</span></div>)}</div><p className="mt-4 text-[11px] text-slate-500">Updated {new Date(state.data.updatedAt).toLocaleString()} · Target interaction remains disabled.</p></div>;
}
