import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { registerWithEmail, resetPassword, signInWithEmail, signInWithGoogle } from "@/firebase";
import { useIsMobile } from "@/hooks/useMobile";
import { Activity, BarChart3, BrainCircuit, Boxes, Building2, FileSearch, FileText, KeyRound, LayoutDashboard, LogOut, Network, PanelLeft, Radar, ScrollText, Settings2, ShieldCheck, ShieldEllipsis, UserRound } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { NotificationIndicator } from "./NotificationIndicator";
import { LanguageSelector } from "./LanguageSelector";
import { TimezoneSelector } from "./TimezoneSelector";
import CommandPalette from "./CommandPalette";
import ThemeSwitcher from "./ThemeSwitcher";
import { useLocale } from "@/contexts/LocaleContext";
import { useRealtimeEvents } from "@/hooks/useRealtimeEvents";

const menuItems = [
  { icon: LayoutDashboard, labelKey: "nav.commandCenter" as const, path: "/" },
  { icon: Activity, labelKey: "nav.mission" as const, path: "/mission" },
  { icon: Boxes, labelKey: "nav.workspaces" as const, path: "/workspaces" },
  { icon: Building2, labelKey: "nav.organizations" as const, path: "/organizations" },
  { icon: BarChart3, labelKey: "nav.observability" as const, path: "/coverage" },
  { icon: BrainCircuit, labelKey: "nav.researcher" as const, path: "/researcher" },
  { icon: BrainCircuit, labelKey: "nav.aiCenter" as const, path: "/ai-center" },
  { icon: Radar, labelKey: "nav.research" as const, path: "/research" },
  { icon: Network, labelKey: "nav.knowledge" as const, path: "/knowledge" },
  { icon: FileText, labelKey: "nav.reports" as const, path: "/reports" },
  { icon: Boxes, labelKey: "nav.inventory" as const, path: "/inventory" },
  { icon: ShieldCheck, labelKey: "nav.governance" as const, path: "/governance" },
  { icon: FileSearch, labelKey: "nav.findings" as const, path: "/findings" },
  { icon: ScrollText, labelKey: "nav.audit" as const, path: "/audit" },
  { icon: Activity, labelKey: "nav.observability" as const, path: "/operations" },
  { icon: Settings2, labelKey: "nav.operations" as const, path: "/operations-console" },
  { icon: ShieldEllipsis, labelKey: "nav.assurance" as const, path: "/assurance" },
  { icon: KeyRound, labelKey: "nav.security" as const, path: "/security" },
  { icon: UserRound, labelKey: "nav.profile" as const, path: "/profile" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const { t } = useLocale();
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"sign-in" | "register">("sign-in");
  const [authBusy, setAuthBusy] = useState(false);
  const handleGoogleSignIn = () => {
    setAuthError(null);
    setAuthNotice(null);
    void signInWithGoogle().then(user => { if (user) window.location.reload(); }).catch(error => setAuthError(error instanceof Error ? error.message : "Google Login failed."));
  };
  const handleEmailAuth = (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setAuthBusy(true);
    const operation = authMode === "register"
      ? registerWithEmail(authEmail, authPassword).then(result => setAuthNotice(`Verification email sent to ${result.email}. Verify it, then sign in.`))
      : signInWithEmail(authEmail, authPassword).then(() => window.location.reload());
    void operation.catch(error => setAuthError(error instanceof Error ? error.message : "Email authentication failed.")).finally(() => setAuthBusy(false));
  };
  const handlePasswordReset = () => {
    setAuthError(null);
    setAuthNotice(null);
    if (!authEmail.trim()) { setAuthError("Enter your email address first."); return; }
    setAuthBusy(true);
    void resetPassword(authEmail).then(() => setAuthNotice("If that address exists, a password reset email has been sent.")).catch(error => setAuthError(error instanceof Error ? error.message : "Password reset failed.")).finally(() => setAuthBusy(false));
  };

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              {t("auth.signInTitle")}
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {t("auth.signInText")}
            </p>
          </div>
            <Button onClick={handleGoogleSignIn} size="lg" className="w-full shadow-lg hover:shadow-xl transition-all" disabled={authBusy}>
              {t("auth.signIn")} with Google
            </Button>
            <div className="w-full border-t pt-6">
              <form onSubmit={handleEmailAuth} className="space-y-3" noValidate>
                <label className="block text-sm font-medium" htmlFor="auth-email">Email</label>
                <input id="auth-email" name="email" type="email" autoComplete="email" required value={authEmail} onChange={event => setAuthEmail(event.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="you@example.com" />
                <label className="block text-sm font-medium" htmlFor="auth-password">Password</label>
                <input id="auth-password" name="password" type="password" autoComplete={authMode === "register" ? "new-password" : "current-password"} minLength={6} required value={authPassword} onChange={event => setAuthPassword(event.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="At least 6 characters" />
                <Button type="submit" size="lg" variant="outline" className="w-full" disabled={authBusy}>{authBusy ? "Working…" : authMode === "register" ? "Create account with email" : "Sign in with email"}</Button>
              </form>
              <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs">
                <button type="button" className="underline underline-offset-4" onClick={() => { setAuthMode(authMode === "register" ? "sign-in" : "register"); setAuthError(null); setAuthNotice(null); }}>{authMode === "register" ? "Already have an account? Sign in" : "Create an account"}</button>
                {authMode === "sign-in" && <button type="button" className="underline underline-offset-4" onClick={handlePasswordReset} disabled={authBusy}>Reset password</button>}
              </div>
            </div>
            {authNotice && <p role="status" className="text-center text-sm text-emerald-600">{authNotice}</p>}
            {authError && <p role="alert" className="text-center text-sm text-destructive">{authError}</p>}
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();
  const { t, isRTL } = useLocale();
  useRealtimeEvents(Boolean(user));

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarBounds = sidebarRef.current?.getBoundingClientRect();
      const newWidth = isRTL ? (sidebarBounds?.right ?? window.innerWidth) - e.clientX : e.clientX - (sidebarBounds?.left ?? 0);
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, isRTL, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          side={isRTL ? "right" : "left"}
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-20 justify-center border-b border-cyan-300/15">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-display font-black tracking-[0.16em] text-fuchsia-300 truncate">ANGELMIND</span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 pt-4">
            {!isCollapsed && <p className="px-5 pb-2 font-mono text-[9px] uppercase tracking-[0.24em] text-cyan-300/70">{t("nav.controlPlane")}</p>}
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={t(item.labelKey)}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span className="tracking-wide">{t(item.labelKey)}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <div className="mb-3 group-data-[collapsible=icon]:hidden"><LanguageSelector /></div>
            <div className="mb-3 group-data-[collapsible=icon]:hidden"><TimezoneSelector /></div>
            <div className="mb-3 group-data-[collapsible=icon]:hidden"><ThemeSwitcher /></div>
            <div className="mb-3 group-data-[collapsible=icon]:hidden"><NotificationIndicator /></div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("auth.signOut")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 ${isRTL ? "left-0" : "right-0"} w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        <CommandPalette />
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem ? t(activeMenuItem.labelKey) : t("nav.menu")}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1"><LanguageSelector compact /><TimezoneSelector compact /><NotificationIndicator compact /></div>
          </div>
        )}
        <main className="flex-1 p-4 pb-24 sm:p-6 sm:pb-6 lg:p-8">{children}</main>
        {isMobile && (
          <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-cyan-300/15 bg-[#080b14]/95 p-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
            {menuItems.slice(0, 5).map(item => {
              const isActive = location === item.path;
              return <button key={item.path} type="button" onClick={() => setLocation(item.path)} aria-current={isActive ? "page" : undefined} className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] transition-colors ${isActive ? "bg-cyan-300/10 text-cyan-200" : "text-slate-500 hover:text-slate-200"}`}><item.icon className="h-4 w-4" /><span className="max-w-full truncate">{t(item.labelKey)}</span></button>;
            })}
          </nav>
        )}
      </SidebarInset>
    </>
  );
}
