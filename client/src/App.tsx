import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Audit from "./pages/Audit";
import Findings from "./pages/Findings";
import Governance from "./pages/Governance";
import Home from "./pages/Home";
import Operations from "./pages/Operations";
import Notifications from "./pages/Notifications";
import OperationsAdmin from "./pages/OperationsAdmin";
import Workspaces from "./pages/Workspaces";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <DashboardLayout>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/workspaces"} component={Workspaces} />
        <Route path={"/governance"} component={Governance} />
        <Route path={"/findings"} component={Findings} />
        <Route path={"/audit"} component={Audit} />
        <Route path={"/operations"} component={Operations} />
        <Route path={"/notifications"} component={Notifications} />
        <Route path={"/operations-console"} component={OperationsAdmin} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
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
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
