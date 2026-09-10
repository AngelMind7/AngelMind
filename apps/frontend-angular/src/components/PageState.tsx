import type { ReactNode } from "react";

export type PageStateKind = "loading" | "success" | "empty" | "error" | "unauthorized" | "offline";

export interface PageStateProps {
  state: PageStateKind;
  children?: ReactNode;
  message?: string;
  onRetry?: () => void;
}

const defaults: Record<PageStateKind, string> = {
  loading: "Loading…",
  success: "Data loaded",
  empty: "No data yet",
  error: "Unable to load data",
  unauthorized: "You do not have access",
  offline: "Connection unavailable",
};

export function PageState({ state, children, message, onRetry }: PageStateProps) {
  if (state === "success") return <>{children}</>;
  return (
    <section className="grid min-h-[180px] place-items-center rounded-lg border border-border p-6 text-center" role={state === "error" ? "alert" : "status"} aria-live="polite">
      <div>
        <p className="text-sm font-medium">{message ?? defaults[state]}</p>
        {state === "error" && onRetry ? <button type="button" className="mt-3 underline" onClick={onRetry}>Retry</button> : null}
      </div>
    </section>
  );
}
