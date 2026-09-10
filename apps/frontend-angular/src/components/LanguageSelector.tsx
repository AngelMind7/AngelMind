import { locales, useLocale } from "@/contexts/LocaleContext";
import { Languages } from "lucide-react";

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLocale();
  return <label className={`flex items-center gap-2 ${compact ? "" : "border border-cyan-300/15 px-2 py-1.5"}`}><Languages className="h-3.5 w-3.5 text-cyan-300" /><span className="sr-only">{t("locale.language")}</span><select aria-label={t("locale.language")} value={locale} onChange={event => setLocale(event.target.value as typeof locale)} className="min-w-0 bg-transparent text-xs text-slate-300 outline-none"><option value="" disabled>{t("locale.language")}</option>{locales.map(item => <option key={item.code} value={item.code}>{compact ? item.code : item.native}</option>)}</select></label>;
}
