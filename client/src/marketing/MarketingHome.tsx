import { LanguageSelector } from "@/components/LanguageSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { translateStatic, useLocale } from "@/contexts/LocaleContext";
import { signInWithGoogle } from "@/firebase";
import { ArrowRight, BookOpen, FileCheck2, ShieldCheck, Waypoints } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";

const pages = {
  "/product": { eyebrow: "marketing.product.eyebrow", title: "marketing.product.title", description: "marketing.product.description" },
  "/features": { eyebrow: "marketing.features.eyebrow", title: "marketing.features.title", description: "marketing.features.description" },
  "/trust": { eyebrow: "marketing.trust.eyebrow", title: "marketing.trust.title", description: "marketing.trust.description" },
  "/docs": { eyebrow: "marketing.docs.eyebrow", title: "marketing.docs.title", description: "marketing.docs.description" },
  "/security": { eyebrow: "marketing.security.eyebrow", title: "marketing.security.title", description: "marketing.security.description" },
} as const;
const pillars = [{ icon: ShieldCheck, title: "marketing.pillar.guard.title", body: "marketing.pillar.guard.body" }, { icon: FileCheck2, title: "marketing.pillar.evidence.title", body: "marketing.pillar.evidence.body" }, { icon: Waypoints, title: "marketing.pillar.rehearsal.title", body: "marketing.pillar.rehearsal.body" }] as const;

export default function MarketingHome() {
  const [location] = useLocation(); const { locale, copy } = useLocale(); const page = pages[location as keyof typeof pages] ?? pages["/product"];
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const handleGoogleSignIn = () => {
    if (isSigningIn) return;
    setAuthError(null);
    setIsSigningIn(true);
    void signInWithGoogle()
      .then(user => { if (user) window.location.reload(); })
      .catch(error => {
        const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
        const message = error instanceof Error ? error.message : "Google Login failed.";
        if (code === "auth/unauthorized-domain") {
          setAuthError("Domain aplikasi belum diizinkan di Firebase Authentication. Tambahkan domain Railway pada Authorized domains.");
        } else if (code === "auth/invalid-api-key" || message.includes("not configured")) {
          setAuthError("Konfigurasi Firebase production belum lengkap. Isi semua VITE_FIREBASE_* di Railway lalu deploy ulang.");
        } else {
          setAuthError(message);
        }
      })
      .finally(() => setIsSigningIn(false));
  };
  return <div className="min-h-screen overflow-hidden bg-[#05060b] text-slate-100"><div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(34,211,238,.12),transparent_30%),radial-gradient(circle_at_85%_0%,rgba(217,70,239,.12),transparent_28%)]" /><header className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8"><Link href="/product" className="font-display text-sm font-black tracking-[.22em] text-fuchsia-300">ANGELMIND</Link><nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex"><Link href="/features" className="transition hover:text-cyan-200">{copy("marketing.nav.features")}</Link><Link href="/docs" className="transition hover:text-cyan-200">{copy("marketing.nav.docs")}</Link><Link href="/pricing" className="transition hover:text-cyan-200">{translateStatic(locale, "Pricing")}</Link><Link href="/trust" className="transition hover:text-cyan-200">{copy("marketing.nav.trust")}</Link><Link href="/security" className="transition hover:text-cyan-200">{copy("marketing.nav.security")}</Link></nav><div className="flex items-center gap-3"><div className="hidden sm:block"><LanguageSelector /></div><Button onClick={handleGoogleSignIn} disabled={isSigningIn} aria-busy={isSigningIn} size="sm" className="neon-button">{isSigningIn ? "Connecting…" : copy("marketing.nav.signIn")} <ArrowRight className="ml-2 h-3.5 w-3.5" /></Button></div></header><main className="relative mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20"><Badge variant="outline" className="border-cyan-300/40 bg-cyan-300/5 font-mono text-[10px] uppercase tracking-[.16em] text-cyan-200">{copy(page.eyebrow)}</Badge><div className="grid gap-10 pt-7 lg:grid-cols-[1.08fr_.92fr] lg:items-end"><div><h1 className="max-w-4xl font-display text-5xl font-black uppercase leading-[.9] tracking-[-.055em] text-white sm:text-7xl">{copy(page.title)}</h1><p className="mt-7 max-w-2xl text-base leading-8 text-slate-400">{copy(page.description)}</p><div className="mt-9 flex flex-wrap gap-3"><Button onClick={handleGoogleSignIn} disabled={isSigningIn} aria-busy={isSigningIn} className="neon-button">{isSigningIn ? "Connecting…" : copy("marketing.cta.open")} <ArrowRight className="ml-2 h-4 w-4" /></Button><Link href="/docs" className="inline-flex h-10 items-center border border-cyan-300/25 px-4 text-sm text-cyan-100 transition hover:bg-cyan-300/10"><BookOpen className="mr-2 h-4 w-4" />{copy("marketing.cta.read")}</Link></div>{authError && <p role="alert" className="mt-3 max-w-xl text-sm text-rose-300">{authError}</p>}</div><div className="border border-cyan-300/20 bg-[#0b1020]/80 p-5 shadow-[0_0_60px_rgba(34,211,238,.08)] backdrop-blur"><p className="font-mono text-[10px] uppercase tracking-[.16em] text-cyan-300">{copy("marketing.safety.eyebrow")}</p><p className="mt-4 font-display text-2xl font-bold text-white">{copy("marketing.safety.title")}</p><p className="mt-4 text-sm leading-6 text-slate-400">{copy("marketing.safety.description")}</p></div></div><section className="mt-20 grid gap-4 md:grid-cols-3">{pillars.map(({ icon: Icon, title, body }) => <article className="border border-cyan-300/15 bg-white/[.025] p-5" key={title}><Icon className="h-5 w-5 text-fuchsia-300" /><h2 className="mt-7 font-display text-xl font-bold text-white">{copy(title)}</h2><p className="mt-3 text-sm leading-6 text-slate-400">{copy(body)}</p></article>)}</section><section className="mt-20 grid gap-8 border-t border-cyan-300/15 pt-10 lg:grid-cols-[.8fr_1.2fr]"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-cyan-300">{copy("marketing.scope.eyebrow")}</p><h2 className="mt-3 font-display text-3xl font-bold text-white">{copy("marketing.scope.title")}</h2></div><div className="grid gap-4 sm:grid-cols-2"><div className="border-l-2 border-cyan-300/70 pl-4"><p className="font-medium text-slate-100">{copy("marketing.scope.implemented.title")}</p><p className="mt-2 text-sm leading-6 text-slate-500">{copy("marketing.scope.implemented.body")}</p></div><div className="border-l-2 border-fuchsia-300/70 pl-4"><p className="font-medium text-slate-100">{copy("marketing.scope.standard.title")}</p><p className="mt-2 text-sm leading-6 text-slate-500">{copy("marketing.scope.standard.body")}</p></div></div></section></main><footer className="relative border-t border-cyan-300/15 px-5 py-8 text-center text-xs text-slate-500"><div className="mb-4 flex flex-wrap justify-center gap-x-5 gap-y-2"><Link href="/changelog" className="transition hover:text-cyan-200">{translateStatic(locale, "Changelog")}</Link><Link href="/roadmap" className="transition hover:text-cyan-200">{translateStatic(locale, "Roadmap")}</Link><Link href="/status" className="transition hover:text-cyan-200">{translateStatic(locale, "Status")}</Link><Link href="/academy" className="transition hover:text-cyan-200">{translateStatic(locale, "Academy")}</Link><Link href="/contact" className="transition hover:text-cyan-200">{translateStatic(locale, "Contact")}</Link><Link href="/privacy" className="transition hover:text-cyan-200">{translateStatic(locale, "Privacy")}</Link><Link href="/terms" className="transition hover:text-cyan-200">{translateStatic(locale, "Terms")}</Link><Link href="/cookies" className="transition hover:text-cyan-200">{translateStatic(locale, "Cookies")}</Link></div>{copy("marketing.footer")}</footer></div>;
}
