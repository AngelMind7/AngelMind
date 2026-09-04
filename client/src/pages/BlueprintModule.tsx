import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  const [events, setEvents] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<Array<{ toolKey?: string; name?: string; riskClass?: string; disposition?: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!location.startsWith("/utf/runners") && !location.startsWith("/tools")) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/v1/tools/catalog", { credentials: "include" })
      .then(response => response.ok ? response.json() : Promise.reject(new Error(`Catalog HTTP ${response.status}`)))
      .then(body => { if (!cancelled) setCatalog(Array.isArray(body?.data) ? body.data.slice(0, 24) : []); })
      .catch(error => { if (!cancelled) setEvents(previous => [`catalog: ${error instanceof Error ? error.message : "unavailable"}`, ...previous]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [location]);

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

  return (
    <main className="space-y-6 p-6" aria-labelledby="blueprint-module-title">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap gap-2"><Badge variant="outline">AngelMind V4</Badge><Badge variant="secondary">Governed</Badge><Badge variant="outline">Operational UI</Badge></div>
          <h1 id="blueprint-module-title" className="text-2xl font-semibold">{config.title}</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">{config.description}</p>
        </div>
        <Button onClick={() => record("workspace action")}>New</Button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {config.actions.map((action, index) => <Card key={action}><CardHeader><CardTitle className="text-base">{action}</CardTitle></CardHeader><CardContent><Button variant={index === 0 ? "default" : "outline"} className="w-full" onClick={() => record(action)}>Open</Button></CardContent></Card>)}
      </section>

      {(location.startsWith("/playbooks") || location.startsWith("/redteam") || location.startsWith("/purpleteam")) && <Card>
        <CardHeader><CardTitle>Safe simulation console</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2"><Input aria-label="Name" placeholder="Operation / exercise name" value={name} onChange={event => setName(event.target.value)} /><Input aria-label="Simulation input" value={input} onChange={event => setInput(event.target.value)} /></div>
          <Textarea aria-label="Simulation notes" placeholder="Scenario notes, expected result, approval reference…" value={input} onChange={event => setInput(event.target.value)} />
          <div className="flex flex-wrap items-center gap-3"><Button onClick={() => record(`simulation ${simulationResult}`)}>Run deterministic simulation</Button><Badge variant="outline">No target traffic</Badge><span className="text-xs text-muted-foreground">Evidence ID: {simulationResult ?? "—"}</span></div>
        </CardContent>
      </Card>}

      {(location.startsWith("/utf/runners") || location.startsWith("/tools")) && <Card>
        <CardHeader><CardTitle>UTF catalog</CardTitle></CardHeader>
        <CardContent>{loading ? <p className="text-sm text-muted-foreground">Loading catalog…</p> : catalog.length ? <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">{catalog.map((tool, index) => <div key={`${tool.toolKey ?? tool.name}-${index}`} className="rounded-md border p-3"><div className="font-mono text-sm">{tool.toolKey ?? tool.name}</div><div className="mt-1 text-xs text-muted-foreground">{tool.riskClass ?? "unknown"} · {tool.disposition ?? "unclassified"}</div></div>)}</div> : <p className="text-sm text-muted-foreground">No catalog records available for this authenticated workspace.</p>}</CardContent>
      </Card>}

      <Card><CardHeader><CardTitle>Activity</CardTitle></CardHeader><CardContent>{events.length ? <ol className="space-y-2 font-mono text-xs">{events.map((event, index) => <li key={`${event}-${index}`} className="rounded border p-2">{event}</li>)}</ol> : <p className="text-sm text-muted-foreground">No activity yet. Actions on this page create local session activity immediately.</p>}</CardContent></Card>
    </main>
  );
}
