import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const plugins = [react(), tailwindcss(), jsxLocPlugin(), VitePWA({
  registerType: "prompt",
  manifest: { name: "AngelMind Security Research Control Plane", short_name: "AngelMind", description: "Governed, evidence-led security research operations.", theme_color: "#05060b", background_color: "#05060b", display: "standalone" },
  workbox: { navigateFallbackDenylist: [/^\/api\//] },
  devOptions: { enabled: false },
})];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/client/src/pages/")) return "app-pages";
          if (id.includes("/client/src/marketing/")) return "marketing";
          if (id.includes("/client/src/contexts/")) return "app-context";
          if (id.includes("/client/src/components/ui/")) return "app-ui";
          if (id.includes("/client/src/components/")) return "app-components";
          if (id.includes("/client/src/firebase")) return "app-auth";
          if (id.endsWith("/client/src/App.tsx")) return "app-shell";
          if (id.endsWith("/client/src/publicRoutes.ts") || id.endsWith("/client/src/authenticatedRoutes.ts")) return "app-routes";

          const marker = "/node_modules/";
          // pnpm paths contain a nested node_modules directory; use the
          // package path after the last one so grouping matches real names.
          const packagePath = id.split(marker).pop();
          if (!packagePath) return undefined;
          const packageName = packagePath.startsWith("@")
            ? packagePath.split("/").slice(0, 2).join("/")
            : packagePath.split("/")[0];

          if (packageName === "react" || packageName === "react-dom") {
            return "vendor-react";
          }
          if (
            packageName.startsWith("@radix-ui/") ||
            packageName === "lucide-react" ||
            packageName === "recharts" ||
            packageName === "framer-motion"
          ) {
            return "vendor-ui";
          }
          if (
            packageName === "firebase" ||
            packageName.startsWith("firebase/") ||
            packageName.startsWith("@firebase/") ||
            packageName.startsWith("@supabase/")
          ) {
            return "vendor-auth";
          }
          if (
            packageName.startsWith("@trpc/") ||
            packageName === "zod" ||
            packageName === "superjson" ||
            packageName === "drizzle-orm" ||
            packageName.startsWith("@tanstack/")
          ) {
            return "vendor-data";
          }
          if (packageName === "react-hook-form" || packageName.startsWith("@hookform/")) {
            return "vendor-forms";
          }
          if (["date-fns", "cmdk", "embla-carousel-react", "next-themes", "sonner", "wouter", "vaul"].includes(packageName)) {
            return "vendor-utils";
          }
          return "vendor";
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
