import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageState } from "@/components/PageState";

const routes: Record<string, { title: string; description: string; actions: string[] }> = {
  "/agents": { title: "Autonomous Workers", description: "AI workers with explicit budgets, timeouts, workspace scope and auditability.", actions: ["Create worker", "Test worker", "View runs"] },
  "/ai/workers": { title: "Autonomous Workers", description: "V4 canonical AI worker namespace. Compatibility /agents remains available.", actions: ["Create worker", "Test worker", "View runs"] },
  "/utf/runners": { title: "UTF Runners", description: "Module runners for the Unified Tool Framework. Live execution remains fail-closed until policy requirements are satisfied.", actions: ["Inspect catalog", "Run simulation", "View history"] },
  "/redteam": { title: "Red Team Operations", description: "Governed adversary simulation with explicit scope, approvals, evidence and audit records.", actions: ["Plan operation", "Run simulation", "Review evidence"] },
  "/redteam/implants": { title: "C2 Implant Registry", description: "Registry and telemetry surface only. Implant behavior is represented by safe simulation fixtures.", actions: ["Register fixture", "Simulate beacon", "View status"] },
  "/redteam/phishing": { title: "Phishing Exercises", description: "Authorized awareness exercises with non-delivery simulation and auditable scenarios.", actions: ["Create scenario", "Preview template", "Record exercise"] },
  "/purpleteam": { title: "Purple Team", description: "Exercise planning, detection validation and improvement tracking.", actions: ["Create exercise", "Run simulation", "Analyze gaps"] },
  "/bugbounty": { title: "Bug Bounty", description: "Program, scope, submission and triage workflow.", actions: ["Create program", "New submission", "Triage queue"] },
  "/playbooks": { title: "DAG Playbooks", description: "Branching and parallel workflow builder with bounded loops and explicit approval gates.", actions: ["New playbook", "Validate DAG", "Simulate run"] },
  "/evidence": { title: "Evidence Vault", description: "Integrity-aware evidence records with provenance, confidence and chain-of-custody metadata.", actions: ["Add evidence", "Verify hash", "Export manifest"] },
};

function configFor(location: string) {
  return Object.entries(routes).sort(([a], [b]) => b.length - a.length).find(([prefix]) => location === prefix || location.startsWith(`${prefix}/`))?.[1] ?? routes["/playbooks"];
}

export default function BlueprintModule() {
  const [location] = useLocation();
  const config = configFor(location);
  const [name, setName] = useState("");
  const [input, setInput] = useState("sample://angelmind-lab");
  const [workspaceId, setWorkspaceId] = useState("");
  const [notes, setNotes] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<Array<{ toolKey?: string; name?: string; riskClass?: string; disposition?: string }>>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogReload, setCatalogReload] = useState(0);
  const [loading, setLoading] = useState(false);
  const [simulationBusy, setSimulationBusy] = useState(false);

  useEffect(() => {
    if (!location.startsWith("/utf/runners") && !location.startsWith("/tools")) return;
    let cancelled = false;
    setLoading(true);
    setCatalogError(null);
    fetch("/api/v1/tools/catalog", { credentials: "include" })
      .then(response => response.ok ? response.json() : Promise.reject(new Error(`Catalog HTTP ${response.status}`)))
      .then(body => { if (!cancelled) setCatalog(Array.isArray(body?.data) ? body.data.slice(0, 24) : []); })
      .catch(error => { if (!cancelled) { const message = error instanceof Error ? error.message : "Catalog unavailable"; setCatalogError(message); setEvents(previous => [`catalog: ${message}`, ...previous]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [location, catalogReload]);

  const simulationResult = useMemo(() => {
    if (!input.trim()) return null;
    const bytes = new TextEncoder().encode(input.trim());
    let hash = 2166136261;
    for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
    return `sim-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }, [input]);

  function record(action: string) {
    const label = name.trim() || config.title;
    setEvents(previous => [`${new Date().toISOString()} · ${action} · ${label}`, ...previous].slice(0, 12));
    setName("");
  }

  async function runSimulation() {
    const parsedWorkspace = Number(workspaceId);
    if (!Number.isSafeInteger(parsedWorkspace) || parsedWorkspace < 1) {
      setEvents(previous => ["simulation: enter a positive workspace ID", ...previous]);
      return;
    }
    setSimulationBusy(true);
    try {
      const response = await fetch("/api/v1/simulations/run", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: parsedWorkspace, name: name.trim() || config.title, input: { fixture: input, notes }, nodes: [
          { id: "observe", kind: "action", capability: "observe.passive" },
          { id: "analyze", kind: "parallel", capability: "analyze.synthetic", dependsOn: ["observe"] },
          { id: "evidence", kind: "merge", capability: "evidence.synthetic", dependsOn: ["analyze"] },
        ] }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.message || `Simulation HTTP ${response.status}`);
      setEvents(previous => [`${new Date().toISOString()} · simulation completed · ${body.data?.simulationId ?? "unknown"} · synthetic evidence ${body.data?.evidence?.length ?? 0}`, ...previous].slice(0, 12));
    } catch (error) {
      setEvents(previous => [`simulation: ${error instanceof Error ? error.message : "failed"}`, ...previous].slice(0, 12));
    } finally {
      setSimulationBusy(false);
    }
  }

  return (
    <main className="space-y-6 p-6" aria-labelledby="blueprint-module-title">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="mb-2 flex flex-wrap gap-2"><Badge variant="outline">AngelMind V4</Badge><Badge variant="secondary">Governed</Badge><Badge variant="outline">Operational UI</Badge></div><h1 id="blueprint-module-title" className="text-2xl font-semibold">{config.title}</h1><p className="mt-2 max-w-3xl text-muted-foreground">{config.description}</p></div>
        <Button onClick={() => record("workspace action")}>New</Button>
      </header>
      <section className="grid gap-4 md:grid-cols-3">{config.actions.map((action, index) => <Card key={action}><CardHeader><CardTitle className="text-base">{action}</CardTitle></CardHeader><CardContent><Button variant={index === 0 ? "default" : "outline"} className="w-full" onClick={() => record(action)}>Open</Button></CardContent></Card>)}</section>

      {(location.startsWith("/playbooks") || location.startsWith("/redteam") || location.startsWith("/purpleteam")) && <Card>
        <CardHeader><CardTitle>Safe simulation console</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3"><Input aria-label="Workspace ID" inputMode="numeric" placeholder="Workspace ID" value={workspaceId} onChange={event => setWorkspaceId(event.target.value)} /><Input aria-label="Simulation name" placeholder="Operation / exercise name" value={name} onChange={event => setName(event.target.value)} /><Input aria-label="Simulation fixture" value={input} onChange={event => setInput(event.target.value)} /></div>
          <Textarea aria-label="Simulation notes" placeholder="Scenario notes, expected result, approval reference…" value={notes} onChange={event => setNotes(event.target.value)} />
          <div className="flex flex-wrap items-center gap-3"><Button onClick={runSimulation} disabled={simulationBusy}>{simulationBusy ? "Running…" : "Run authenticated simulation"}</Button><Badge variant="outline">No target traffic</Badge><span className="text-xs text-muted-foreground">Preview: {simulationResult ?? "—"}</span></div>
        </CardContent>
      </Card>}

      {(location.startsWith("/utf/runners") || location.startsWith("/tools")) && (
        <Card>
          <CardHeader><CardTitle>UTF catalog</CardTitle></CardHeader>
          <CardContent>
            {loading ? <PageState state="loading" message="Loading authenticated tool catalog…" /> : catalogError ? <PageState state="error" message={catalogError} onRetry={() => setCatalogReload(value => value + 1)} /> : catalog.length ? (
              <PageState state="success">
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {catalog.map((tool, index) => <div key={`${tool.toolKey ?? tool.name}-${index}`} className="rounded-md border p-3"><div className="font-mono text-sm">{tool.toolKey ?? tool.name}</div><div className="mt-1 text-xs text-muted-foreground">{tool.riskClass ?? "unknown"} · {tool.disposition ?? "unclassified"}</div></div>)}
                </div>
              </PageState>
            ) : <PageState state="empty" message="No catalog records available for this authenticated workspace." />}
          </CardContent>
        </Card>
      )}
      <Card><CardHeader><CardTitle>Activity</CardTitle></CardHeader><CardContent>{events.length ? <ol className="space-y-2 font-mono text-xs">{events.map((event, index) => <li key={`${event}-${index}`} className="rounded border p-2">{event}</li>)}</ol> : <p className="text-sm text-muted-foreground">No activity yet.</p>}</CardContent></Card>
    </main>
  );
}
