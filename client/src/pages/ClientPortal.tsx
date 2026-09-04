import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const findings = [
  ["Critical", "Authentication boundary requires remediation", "Open"],
  ["High", "Public exposure detected on approved asset", "In progress"],
  ["Medium", "Security configuration improvement", "Planned"],
] as const;

export default function ClientPortal() {
  const { orgSlug = "organization" } = useParams<{ orgSlug?: string }>();
  const [tab, setTab] = useState("dashboard");
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    document.documentElement.dataset.portal = "client";
    return () => delete document.documentElement.dataset.portal;
  }, []);

  function audit(event: string) {
    setEvents(previous => [`${new Date().toISOString()} · ${event}`, ...previous].slice(0, 10));
  }

  const tabs = ["dashboard", "findings", "remediation", "compliance", "audit"];
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 sm:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">AngelMind Client Portal</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{orgSlug}</h1><p className="mt-2 text-sm text-slate-600">Executive security overview with tenant-scoped, non-technical presentation.</p></div>
          <Button variant="outline" onClick={() => { audit("report export requested"); window.print(); }}>Export / Print</Button>
        </header>
        <nav className="flex flex-wrap gap-2" aria-label="Client portal sections">{tabs.map(item => <Button key={item} variant={tab === item ? "default" : "outline"} onClick={() => { setTab(item); audit(`${item} viewed`); }}>{item[0].toUpperCase() + item.slice(1)}</Button>)}</nav>

        {tab === "dashboard" && <section aria-label="Executive dashboard" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[['Security score','82','+4 this period'],['Risk trend','↓ 12%','Improving'],['Compliance','78%','Controls mapped'],['Open findings',String(findings.length),'Approved scope']].map(([label,value,detail]) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p><p className="mt-2 text-xs text-slate-500">{detail}</p></article>)}
        </section>}

        {tab === "findings" && <section className="space-y-3" aria-label="Finding summaries">{findings.map(([severity,title,status]) => <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-medium">{title}</h2><div className="flex gap-2"><Badge variant="outline">{severity}</Badge><Badge variant="secondary">{status}</Badge></div></div><p className="mt-3 text-sm text-slate-600">Business impact and recommended remediation are shown here; raw commands and tool output remain outside the client surface.</p></article>)}</section>}

        {tab === "remediation" && <section className="space-y-3"><div className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Remediation tracker</h2><p className="mt-2 text-sm text-slate-600">Owners and milestones are tracked against findings.</p></div>{findings.map(([_, title, status], index) => <div key={title} className="grid gap-2 rounded-xl border bg-white p-4 sm:grid-cols-[1fr_auto_auto]"><span>{title}</span><span className="text-sm text-slate-500">Owner: Security</span><Badge variant="outline">{index === 0 ? "Review" : status}</Badge></div>)}</section>}

        {tab === "compliance" && <section className="grid gap-4 sm:grid-cols-3">{['SOC 2','ISO 27001','PCI-DSS'].map(framework => <article key={framework} className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="font-semibold">{framework}</h2><p className="mt-4 text-3xl font-semibold">78%</p><p className="mt-1 text-sm text-slate-500">Mapped controls</p></article>)}</section>}

        {tab === "audit" && <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="font-semibold">Portal audit trail</h2><ol className="mt-4 space-y-2">{events.length ? events.map((event, index) => <li key={`${event}-${index}`} className="rounded border p-3 font-mono text-xs">{event}</li>) : <li className="text-sm text-slate-500">No events recorded in this browser session yet.</li>}</ol></section>}
      </div>
    </main>
  );
}
