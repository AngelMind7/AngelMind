import { useEffect } from "react";

const cards = [
  ["Security score", "—", "Awaiting authenticated organization data"],
  ["Risk trend", "—", "No live trend loaded"],
  ["Compliance", "—", "No compliance snapshot loaded"],
  ["Open findings", "—", "No finding summary loaded"],
];

export default function ClientPortal() {
  useEffect(() => {
    document.documentElement.dataset.portal = "client";
    return () => delete document.documentElement.dataset.portal;
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">AngelMind Client Portal</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Executive security overview</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              A non-technical view of risk, reports, remediation, compliance and access history. Live organization data is shown only after the portal session is authenticated.
            </p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">Session required</span>
        </header>

        <section aria-label="Executive dashboard" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([label, value, detail]) => (
            <article key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-3 text-3xl font-semibold">{value}</p>
              <p className="mt-2 text-xs text-slate-500">{detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Reports</h2>
            <p className="mt-2 text-sm text-slate-600">PDF reports, versions and watermarked executive views are available to authorized portal roles.</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Remediation</h2>
            <p className="mt-2 text-sm text-slate-600">Track finding ownership, target dates and remediation progress without exposing raw tool output.</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Compliance</h2>
            <p className="mt-2 text-sm text-slate-600">Review SOC 2, ISO 27001, PCI-DSS and GDPR control progress for the organization.</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Audit access</h2>
            <p className="mt-2 text-sm text-slate-600">Portal access is intended to remain attributable, tenant-scoped and auditable.</p>
          </article>
        </section>
      </div>
    </main>
  );
}
