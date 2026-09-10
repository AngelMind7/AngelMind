import { useState } from "react";

const seedIncidents = [
  { id: "INC-0001", title: "Example incident", severity: "medium", status: "open", updated: "—" },
];

export default function Incidents() {
  const [incidents, setIncidents] = useState(seedIncidents);
  const [title, setTitle] = useState("");

  function createIncident() {
    const value = title.trim();
    if (!value) return;
    setIncidents(current => [
      {
        id: `INC-${String(current.length + 1).padStart(4, "0")}`,
        title: value,
        severity: "medium",
        status: "open",
        updated: new Date().toISOString(),
      },
      ...current,
    ]);
    setTitle("");
  }

  return (
    <main className="space-y-6 p-6" aria-labelledby="incidents-title">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[.18em] text-cyan-300">Governance / Response</p>
          <h1 id="incidents-title" className="mt-2 text-3xl font-semibold">Security Incidents</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Track, acknowledge, investigate, and close security incidents with workspace-scoped records.</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <span className="text-muted-foreground">Open</span>{" "}
          <strong>{incidents.filter(item => item.status === "open").length}</strong>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="create-incident-title">
        <h2 id="create-incident-title" className="text-sm font-medium">Create incident</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            onKeyDown={event => { if (event.key === "Enter") createIncident(); }}
            placeholder="Incident title"
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-400"
            aria-label="Incident title"
          />
          <button type="button" onClick={createIncident} className="rounded-md border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-medium hover:bg-cyan-400/20">
            Create
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="incident-list-title">
        <h2 id="incident-list-title" className="sr-only">Incident list</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th></tr>
            </thead>
            <tbody>
              {incidents.map(incident => (
                <tr key={incident.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{incident.id}</td>
                  <td className="px-4 py-3 font-medium">{incident.title}</td>
                  <td className="px-4 py-3 capitalize">{incident.severity}</td>
                  <td className="px-4 py-3 capitalize">{incident.status}</td>
                  <td className="px-4 py-3 text-muted-foreground">{incident.updated === "—" ? "—" : new Date(incident.updated).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
