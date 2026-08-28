import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LocaleProvider, StaticCopyLocalizer } from "./contexts/LocaleContext";
import DashboardLayout from "./components/DashboardLayout";
import { authenticatedRoutes } from "./authenticatedRoutes";
import MarketingHome from "./marketing/MarketingHome";
import ApiPlayground from "./marketing/ApiPlayground";
import TrustCenter from "./marketing/TrustCenter";
import { publicRoutes } from "@/publicRoutes";
import OfflineStatus from "./components/OfflineStatus";

function Router() {
  return <Switch>{publicRoutes.map(route => <Route key={route.path} path={route.path} component={route.component} />)}<Route component={DashboardRouter} /></Switch>;
}

function DashboardRouter() {
  // make sure to consider if you need authentication for certain routes
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="grid min-h-[320px] place-items-center" role="status" aria-live="polite"><span className="font-mono text-xs uppercase tracking-[.16em] text-cyan-300">Loading secured workspace…</span></div>}>
        <Switch>
          {authenticatedRoutes.map(route => <Route key={route.path} path={route.path} component={route.component} />)}
          <Route path={"/404"} component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </DashboardLayout>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        switchable
      >
        <LocaleProvider>
          <TooltipProvider>
            <StaticCopyLocalizer />
            <OfflineStatus />
            <Toaster />
            <Router />
          </TooltipProvider>
        </LocaleProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
