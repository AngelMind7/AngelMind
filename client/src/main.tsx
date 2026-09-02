import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./pwa/registerServiceWorker";
import { completeGoogleRedirectSignIn, getFirebaseIdToken } from "./firebase";
import { trpc } from "./lib/trpc";

const queryClient = new QueryClient();

function loadConfiguredAnalytics() {
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT?.trim();
  const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID?.trim();
  if (!endpoint || !websiteId || typeof document === "undefined") return;

  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" && url.protocol !== "http:") return;
    const script = document.createElement("script");
    script.defer = true;
    script.src = `${url.toString().replace(/\/+$/, "")}/umami`;
    script.dataset.websiteId = websiteId;
    document.body.appendChild(script);
  } catch {
    // Ignore malformed optional analytics configuration; the application remains usable.
  }
}

loadConfiguredAnalytics();
registerServiceWorker();

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    if (error instanceof TRPCClientError) {
      console.error("[API Query Error]", error.message);
    } else {
      console.error("[API Query Error]", error);
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    if (error instanceof TRPCClientError) {
      console.error("[API Mutation Error]", error.message);
    } else {
      console.error("[API Mutation Error]", error);
    }
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async fetch(input, init) {
        const token = await getFirebaseIdToken();
        const headers = new Headers(init?.headers);
        if (token) headers.set("authorization", `Bearer ${token}`);
        return globalThis.fetch(input, {
          ...(init ?? {}),
          headers,
          credentials: "include",
        });
      },
    }),
  ],
});

function renderApp() {
  createRoot(document.getElementById("root")!).render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>,
  );
}

function bootstrap() {
  // Render the shell first. Firebase's redirect-result check can wait on
  // browser storage/network state, especially on mobile; it must never block
  // the public page and its sign-in button from mounting.
  renderApp();
  void completeGoogleRedirectSignIn().catch(error => {
    console.error("[Firebase Auth] Redirect sign-in failed", error);
  });
}

bootstrap();
