const CACHE_NAME = "angelmind-shell-v1";
const SHELL_ASSETS = ["/", "/product", "/trust", "/manifest.json"] as const;

export function registerServiceWorker() {
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }
}

export { CACHE_NAME, SHELL_ASSETS };
