import { LanguageSelector } from "@/components/LanguageSelector";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/contexts/LocaleContext";
import { FileCheck2, LockKeyhole, ShieldCheck, Waypoints } from "lucide-react";
import { Link } from "wouter";

const inventory = [
  { icon: ShieldCheck, title: "marketing.pillar.guard.title", body: "marketing.pillar.guard.body" },
  { icon: FileCheck2, title: "marketing.pillar.evidence.title", body: "marketing.pillar.evidence.body" },
  { icon: Waypoints, title: "marketing.pillar.rehearsal.title", body: "marketing.pillar.rehearsal.body" },
  { icon: LockKeyhole, title: "marketing.scope.standard.title", body: "marketing.scope.standard.body" },
] as const;

export default function TrustCenter() {
  const { copy } = useLocale();
  return <div className="min-h-screen bg-[#05060b] px-5 py-6 text-slate-100 sm:px-8"><header className="mx-auto flex max-w-6xl items-center justify-between"><Link href="/product" className="font-display text-sm font-black tracking-[.22em] text-fuchsia-300">ANGELMIND</Link><LanguageSelector /></header><main className="mx-auto max-w-6xl pb-20 pt-16"><Badge variant="outline" className="border-cyan-300/40 bg-cyan-300/5 font-mono text-[10px] uppercase tracking-[.16em] text-cyan-200">{copy("marketing.trust.eyebrow")}</Badge><h1 className="mt-5 max-w-3xl font-display text-5xl font-black uppercase leading-[.94] tracking-[-.045em] text-white sm:text-6xl">{copy("marketing.trust.title")}</h1><p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">{copy("marketing.trust.description")}</p><section className="mt-12 grid gap-4 md:grid-cols-2">{inventory.map(({ icon: Icon, title, body }) => <article key={title} className="border border-cyan-300/15 bg-[#0b1020]/80 p-6"><Icon className="h-5 w-5 text-fuchsia-300" /><h2 className="mt-7 font-display text-xl font-bold text-white">{copy(title)}</h2><p className="mt-3 text-sm leading-6 text-slate-400">{copy(body)}</p></article>)}</section><section className="mt-8 border-l-2 border-amber-300/70 bg-amber-300/[.035] p-6"><p className="font-display text-lg font-bold text-amber-50">{copy("marketing.safety.title")}</p><p className="mt-3 max-w-3xl text-sm leading-6 text-amber-100/70">{copy("marketing.safety.description")}</p></section></main></div>;
}
