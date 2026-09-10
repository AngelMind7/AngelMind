import { commonTimeZones, useLocale } from "@/contexts/LocaleContext";
import { Clock3 } from "lucide-react";

export function TimezoneSelector({ compact = false }: { compact?: boolean }) {
  const { timeZone, setTimeZone, t } = useLocale();
  return <label className={`flex items-center gap-2 ${compact ? "" : "border border-cyan-300/15 px-2 py-1.5"}`}><Clock3 className="h-3.5 w-3.5 text-cyan-300" /><span className="sr-only">{t("locale.timeZone")}</span><select aria-label={t("locale.timeZone")} value={timeZone} onChange={event => setTimeZone(event.target.value)} className="min-w-0 bg-transparent text-xs text-slate-300 outline-none"><option value="" disabled>{t("locale.timeZone")}</option>{commonTimeZones.map(zone => <option key={zone} value={zone}>{compact ? zone.replace("_", " ") : zone}</option>)}</select></label>;
}
