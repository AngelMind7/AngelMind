import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import staticTranslations from "@/locales/curated-translations.json";
import homeCopy from "@/locales/home-copy.json";
import assuranceNotificationsCopy from "@/locales/assurance-notifications-copy.json";

export const locales = [
  { code: "en", label: "English", native: "English", dir: "ltr" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia", dir: "ltr" },
  { code: "ms", label: "Malay", native: "Bahasa Melayu", dir: "ltr" },
  { code: "ar", label: "Arabic", native: "العربية", dir: "rtl" },
  { code: "zh-CN", label: "Simplified Chinese", native: "简体中文", dir: "ltr" },
  { code: "ja", label: "Japanese", native: "日本語", dir: "ltr" },
  { code: "ko", label: "Korean", native: "한국어", dir: "ltr" },
  { code: "es", label: "Spanish", native: "Español", dir: "ltr" },
  { code: "pt", label: "Portuguese", native: "Português", dir: "ltr" },
  { code: "fr", label: "French", native: "Français", dir: "ltr" },
  { code: "de", label: "German", native: "Deutsch", dir: "ltr" },
  { code: "ru", label: "Russian", native: "Русский", dir: "ltr" },
] as const;

export type LocaleCode = (typeof locales)[number]["code"];
type TranslationKey = keyof typeof english;
type ExplicitCopyKey = keyof typeof homeCopy | keyof typeof assuranceNotificationsCopy;
const LOCALE_KEY = "angelmind-locale";
const TIME_ZONE_KEY = "angelmind-time-zone";
export const commonTimeZones = ["UTC", "Asia/Jakarta", "Asia/Kuala_Lumpur", "Asia/Riyadh", "Asia/Shanghai", "Asia/Tokyo", "Asia/Seoul", "Europe/Madrid", "America/Sao_Paulo", "Europe/Paris", "Europe/Berlin", "Europe/Moscow", "America/New_York", "America/Los_Angeles"] as const;
const timeZoneLabels: Record<LocaleCode, string> = { en: "Time zone", id: "Zona waktu", ms: "Zon masa", ar: "المنطقة الزمنية", "zh-CN": "时区", ja: "タイムゾーン", ko: "시간대", es: "Zona horaria", pt: "Fuso horário", fr: "Fuseau horaire", de: "Zeitzone", ru: "Часовой пояс" };

const english = { "nav.controlPlane": "Control plane", "nav.commandCenter": "Command center", "nav.workspaces": "Workspaces", "nav.governance": "Governance", "nav.findings": "Findings", "nav.audit": "Evidence & audit", "nav.observability": "Observability", "nav.operations": "Operations console", "nav.assurance": "Assurance control", "nav.notifications": "Notifications", "nav.menu": "Menu", "auth.signIn": "Sign in", "auth.signOut": "Sign out", "auth.signInTitle": "Sign in to continue", "auth.signInText": "Access to this dashboard requires authentication. Continue to launch the login flow.", "locale.language": "Language", "locale.timeZone": "Time zone", "common.selectWorkspace": "Select workspace", "common.approve": "Approve", "common.reject": "Reject", "common.create": "Create", "common.resolve": "Resolve", "common.link": "Link", "status.pending": "Pending", "status.disabled": "Disabled" } as const;

const packs: Record<LocaleCode, Partial<Record<TranslationKey, string>>> = {
  en: english,
  id: { "nav.controlPlane": "Control plane", "nav.commandCenter": "Pusat komando", "nav.workspaces": "Ruang kerja", "nav.governance": "Tata kelola", "nav.findings": "Temuan", "nav.audit": "Bukti & audit", "nav.observability": "Observabilitas", "nav.operations": "Konsol operasi", "nav.assurance": "Kontrol jaminan", "nav.notifications": "Notifikasi", "nav.menu": "Menu", "auth.signIn": "Masuk", "auth.signOut": "Keluar", "auth.signInTitle": "Masuk untuk melanjutkan", "auth.signInText": "Akses ke dashboard ini memerlukan autentikasi. Lanjutkan untuk memulai proses masuk.", "locale.language": "Bahasa", "locale.timeZone": "Zona waktu", "common.selectWorkspace": "Pilih ruang kerja", "common.approve": "Setujui", "common.reject": "Tolak", "common.create": "Buat", "common.resolve": "Selesaikan", "common.link": "Tautkan", "status.pending": "Menunggu", "status.disabled": "Nonaktif" },
  ms: { "nav.controlPlane": "Ruang kawalan", "nav.commandCenter": "Pusat arahan", "nav.workspaces": "Ruang kerja", "nav.governance": "Tadbir urus", "nav.findings": "Penemuan", "nav.audit": "Bukti & audit", "nav.observability": "Kebolehcerapan", "nav.operations": "Konsol operasi", "nav.assurance": "Kawalan jaminan", "nav.notifications": "Pemberitahuan", "nav.menu": "Menu", "auth.signIn": "Log masuk", "auth.signOut": "Log keluar", "auth.signInTitle": "Log masuk untuk meneruskan", "auth.signInText": "Akses ke papan pemuka ini memerlukan pengesahan.", "locale.language": "Bahasa", "locale.timeZone": "Zon masa", "common.selectWorkspace": "Pilih ruang kerja", "common.approve": "Luluskan", "common.reject": "Tolak", "common.create": "Cipta", "common.resolve": "Selesaikan", "common.link": "Pautkan", "status.pending": "Menunggu", "status.disabled": "Dilumpuhkan" },
  ar: { "nav.controlPlane": "لوحة التحكم", "nav.commandCenter": "مركز القيادة", "nav.workspaces": "مساحات العمل", "nav.governance": "الحوكمة", "nav.findings": "النتائج", "nav.audit": "الأدلة والتدقيق", "nav.observability": "المراقبة", "nav.operations": "وحدة العمليات", "nav.assurance": "ضبط الضمان", "nav.notifications": "الإشعارات", "nav.menu": "القائمة", "auth.signIn": "تسجيل الدخول", "auth.signOut": "تسجيل الخروج", "auth.signInTitle": "سجل الدخول للمتابعة", "auth.signInText": "يتطلب الوصول إلى لوحة التحكم هذه المصادقة.", "locale.language": "اللغة", "locale.timeZone": "المنطقة الزمنية", "common.selectWorkspace": "اختر مساحة العمل", "common.approve": "موافقة", "common.reject": "رفض", "common.create": "إنشاء", "common.resolve": "حل", "common.link": "ربط", "status.pending": "قيد الانتظار", "status.disabled": "معطل" },
  "zh-CN": { "nav.controlPlane": "控制平面", "nav.commandCenter": "指挥中心", "nav.workspaces": "工作区", "nav.governance": "治理", "nav.findings": "发现", "nav.audit": "证据与审计", "nav.observability": "可观测性", "nav.operations": "运营控制台", "nav.assurance": "保障控制", "nav.notifications": "通知", "nav.menu": "菜单", "auth.signIn": "登录", "auth.signOut": "退出登录", "auth.signInTitle": "登录以继续", "auth.signInText": "访问此仪表板需要身份验证。", "locale.language": "语言", "locale.timeZone": "时区", "common.selectWorkspace": "选择工作区", "common.approve": "批准", "common.reject": "拒绝", "common.create": "创建", "common.resolve": "解决", "common.link": "关联", "status.pending": "待处理", "status.disabled": "已禁用" },
  ja: { "nav.controlPlane": "コントロールプレーン", "nav.commandCenter": "コマンドセンター", "nav.workspaces": "ワークスペース", "nav.governance": "ガバナンス", "nav.findings": "検出事項", "nav.audit": "証拠と監査", "nav.observability": "可観測性", "nav.operations": "運用コンソール", "nav.assurance": "保証コントロール", "nav.notifications": "通知", "nav.menu": "メニュー", "auth.signIn": "ログイン", "auth.signOut": "ログアウト", "auth.signInTitle": "続行するにはログイン", "auth.signInText": "このダッシュボードにアクセスするには認証が必要です。", "locale.language": "言語", "common.selectWorkspace": "ワークスペースを選択", "common.approve": "承認", "common.reject": "却下", "common.create": "作成", "common.resolve": "解決", "common.link": "リンク", "status.pending": "保留中", "status.disabled": "無効" },
  ko: { "nav.controlPlane": "제어 영역", "nav.commandCenter": "명령 센터", "nav.workspaces": "작업 공간", "nav.governance": "거버넌스", "nav.findings": "발견 사항", "nav.audit": "증거 및 감사", "nav.observability": "관측성", "nav.operations": "운영 콘솔", "nav.assurance": "보증 제어", "nav.notifications": "알림", "nav.menu": "메뉴", "auth.signIn": "로그인", "auth.signOut": "로그아웃", "auth.signInTitle": "계속하려면 로그인", "auth.signInText": "이 대시보드에 액세스하려면 인증이 필요합니다.", "locale.language": "언어", "common.selectWorkspace": "작업 공간 선택", "common.approve": "승인", "common.reject": "거부", "common.create": "생성", "common.resolve": "해결", "common.link": "연결", "status.pending": "보류", "status.disabled": "비활성화" },
  es: { "nav.controlPlane": "Plano de control", "nav.commandCenter": "Centro de mando", "nav.workspaces": "Espacios de trabajo", "nav.governance": "Gobernanza", "nav.findings": "Hallazgos", "nav.audit": "Evidencia y auditoría", "nav.observability": "Observabilidad", "nav.operations": "Consola de operaciones", "nav.assurance": "Control de aseguramiento", "nav.notifications": "Notificaciones", "nav.menu": "Menú", "auth.signIn": "Iniciar sesión", "auth.signOut": "Cerrar sesión", "auth.signInTitle": "Inicia sesión para continuar", "auth.signInText": "El acceso a este panel requiere autenticación.", "locale.language": "Idioma", "common.selectWorkspace": "Seleccionar espacio", "common.approve": "Aprobar", "common.reject": "Rechazar", "common.create": "Crear", "common.resolve": "Resolver", "common.link": "Vincular", "status.pending": "Pendiente", "status.disabled": "Desactivado" },
  pt: { "nav.controlPlane": "Plano de controle", "nav.commandCenter": "Centro de comando", "nav.workspaces": "Espaços de trabalho", "nav.governance": "Governança", "nav.findings": "Descobertas", "nav.audit": "Evidências e auditoria", "nav.observability": "Observabilidade", "nav.operations": "Console de operações", "nav.assurance": "Controle de garantia", "nav.notifications": "Notificações", "nav.menu": "Menu", "auth.signIn": "Entrar", "auth.signOut": "Sair", "auth.signInTitle": "Entre para continuar", "auth.signInText": "O acesso a este painel exige autenticação.", "locale.language": "Idioma", "common.selectWorkspace": "Selecionar espaço", "common.approve": "Aprovar", "common.reject": "Rejeitar", "common.create": "Criar", "common.resolve": "Resolver", "common.link": "Vincular", "status.pending": "Pendente", "status.disabled": "Desativado" },
  fr: { "nav.controlPlane": "Plan de contrôle", "nav.commandCenter": "Centre de commande", "nav.workspaces": "Espaces de travail", "nav.governance": "Gouvernance", "nav.findings": "Constats", "nav.audit": "Preuves et audit", "nav.observability": "Observabilité", "nav.operations": "Console d’opérations", "nav.assurance": "Contrôle d’assurance", "nav.notifications": "Notifications", "nav.menu": "Menu", "auth.signIn": "Se connecter", "auth.signOut": "Se déconnecter", "auth.signInTitle": "Connectez-vous pour continuer", "auth.signInText": "L’accès à ce tableau de bord nécessite une authentification.", "locale.language": "Langue", "common.selectWorkspace": "Sélectionner l’espace", "common.approve": "Approuver", "common.reject": "Rejeter", "common.create": "Créer", "common.resolve": "Résoudre", "common.link": "Lier", "status.pending": "En attente", "status.disabled": "Désactivé" },
  de: { "nav.controlPlane": "Kontrollebene", "nav.commandCenter": "Kommandozentrale", "nav.workspaces": "Arbeitsbereiche", "nav.governance": "Governance", "nav.findings": "Erkenntnisse", "nav.audit": "Nachweise & Audit", "nav.observability": "Beobachtbarkeit", "nav.operations": "Betriebskonsole", "nav.assurance": "Sicherheitskontrolle", "nav.notifications": "Benachrichtigungen", "nav.menu": "Menü", "auth.signIn": "Anmelden", "auth.signOut": "Abmelden", "auth.signInTitle": "Zum Fortfahren anmelden", "auth.signInText": "Der Zugriff auf dieses Dashboard erfordert eine Anmeldung.", "locale.language": "Sprache", "common.selectWorkspace": "Arbeitsbereich wählen", "common.approve": "Genehmigen", "common.reject": "Ablehnen", "common.create": "Erstellen", "common.resolve": "Lösen", "common.link": "Verknüpfen", "status.pending": "Ausstehend", "status.disabled": "Deaktiviert" },
  ru: { "nav.controlPlane": "Панель управления", "nav.commandCenter": "Центр управления", "nav.workspaces": "Рабочие пространства", "nav.governance": "Управление", "nav.findings": "Находки", "nav.audit": "Доказательства и аудит", "nav.observability": "Наблюдаемость", "nav.operations": "Операционная консоль", "nav.assurance": "Контроль гарантий", "nav.notifications": "Уведомления", "nav.menu": "Меню", "auth.signIn": "Войти", "auth.signOut": "Выйти", "auth.signInTitle": "Войдите, чтобы продолжить", "auth.signInText": "Для доступа к панели требуется аутентификация.", "locale.language": "Язык", "common.selectWorkspace": "Выберите пространство", "common.approve": "Одобрить", "common.reject": "Отклонить", "common.create": "Создать", "common.resolve": "Решить", "common.link": "Связать", "status.pending": "Ожидание", "status.disabled": "Отключено" },
};

const staticKeyOverrides: Record<string, TranslationKey> = {
  "Select workspace": "common.selectWorkspace", "Approve": "common.approve", "Reject": "common.reject", "Create": "common.create", "Resolve": "common.resolve", "Link": "common.link", "pending": "status.pending", "disabled": "status.disabled",
};

export function isValidTimeZone(timeZone: string) { try { Intl.DateTimeFormat(undefined, { timeZone }); return true; } catch { return false; } }
export function formatLocaleDate(locale: LocaleCode, input: Date | string | number, timeZone: string) { return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(input)); }
type LocaleContextValue = { locale: LocaleCode; setLocale: (locale: LocaleCode) => void; timeZone: string; setTimeZone: (timeZone: string) => void; t: (key: TranslationKey) => string; copy: (key: ExplicitCopyKey) => string; formatDate: (value: Date | string | number) => string; formatNumber: (value: number) => string; isRTL: boolean };
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function isLocaleCode(value: string): value is LocaleCode { return locales.some(item => item.code === value); }
export function getLocaleDirection(locale: LocaleCode) { return locales.find(item => item.code === locale)?.dir ?? "ltr"; }
export function translate(locale: LocaleCode, key: TranslationKey): string { return (key === "locale.timeZone" ? timeZoneLabels[locale] : packs[locale][key]) || english[key]; }
export function isSafeStaticPhrase(phrase: string): boolean { return phrase.length > 1 && phrase.length < 240 && /[A-Za-z]/.test(phrase) && !/(=>|\bconst\b|\breturn\b|\buseState\b|\buseQuery\b|@nextjs|[{};]|= MIN_WIDTH|\[.*\])/.test(phrase); }
export function translateStatic(locale: LocaleCode, englishText: string): string { if (!isSafeStaticPhrase(englishText)) return englishText; const catalogValue = (staticTranslations as Record<string, Partial<Record<LocaleCode, string>>>)[englishText]?.[locale]; return catalogValue || (staticKeyOverrides[englishText] ? translate(locale, staticKeyOverrides[englishText]) : englishText); }
export function localizeEmbeddedTimestamp(locale: LocaleCode, value: string, timeZone = "UTC"): string {
  const pattern = /\b\d{1,2}\/\d{1,2}\/\d{4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s+[AP]M\b/g;
  return value.replace(pattern, source => {
    const parsed = new Date(source);
    return Number.isNaN(parsed.getTime()) ? source : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(parsed);
  });
}

/** Localizes only static rendered UI text and descriptive attributes; it never reads or transforms user-entered workspace data. */
export function StaticCopyLocalizer() {
  const { locale, timeZone } = useLocale();
  const textOriginals = useRef(new WeakMap<Text, string>());
  const attrOriginals = useRef(new WeakMap<Element, Map<string, string>>());
  useEffect(() => {
    const localize = (root: ParentNode) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      nodes.forEach(node => {
        if (node.parentElement?.closest("script,style,code,pre,[data-no-localize]")) return;
        const original = textOriginals.current.get(node) ?? node.data;
        textOriginals.current.set(node, original);
        const normalized = original.replace(/\s+/g, " ").trim();
        const translated = localizeEmbeddedTimestamp(locale, translateStatic(locale, normalized), timeZone);
        if (translated !== normalized) node.data = original.replace(normalized, translated);
      });
      root.querySelectorAll?.("[placeholder],[aria-label],[title]").forEach(element => {
        ["placeholder", "aria-label", "title"].forEach(attribute => {
          const value = element.getAttribute(attribute);
          if (!value) return;
          const map = attrOriginals.current.get(element) ?? new Map<string, string>();
          const original = map.get(attribute) ?? value;
          map.set(attribute, original); attrOriginals.current.set(element, map);
          const translated = translateStatic(locale, original);
          if (translated !== original) element.setAttribute(attribute, translated);
        });
      });
    };
    localize(document.body);
    const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) localize(node as ParentNode); })));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [locale, timeZone]);
  return null;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<LocaleCode>(() => { const requested = new URLSearchParams(window.location.search).get("lang"); const saved = requested || localStorage.getItem(LOCALE_KEY) || "en"; return isLocaleCode(saved) ? saved : "en"; });
  const [timeZone, setTimeZone] = useState(() => { const saved = localStorage.getItem(TIME_ZONE_KEY); return saved && isValidTimeZone(saved) ? saved : Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; });
  const meta = locales.find(item => item.code === locale) ?? locales[0];
  useEffect(() => { localStorage.setItem(LOCALE_KEY, locale); document.documentElement.lang = locale; document.documentElement.dir = meta.dir; }, [locale, meta.dir]);
  useEffect(() => { localStorage.setItem(TIME_ZONE_KEY, timeZone); }, [timeZone]);
  const value = useMemo(() => ({ locale, setLocale, timeZone, setTimeZone, isRTL: meta.dir === "rtl", t: (key: TranslationKey) => translate(locale, key), copy: (key: ExplicitCopyKey) => { const copy = key in homeCopy ? homeCopy[key as keyof typeof homeCopy] : assuranceNotificationsCopy[key as keyof typeof assuranceNotificationsCopy]; return copy?.[locale] ?? copy?.en ?? key; }, formatDate: (input: Date | string | number) => formatLocaleDate(locale, input, timeZone), formatNumber: (value: number) => new Intl.NumberFormat(locale).format(value) }), [locale, meta.dir, timeZone]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() { const value = useContext(LocaleContext); if (!value) throw new Error("useLocale must be used within LocaleProvider"); return value; }
