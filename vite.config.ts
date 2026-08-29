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
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(id)) return "vendor-react";
          if (/[\\/]node_modules[\\/](@trpc|zod|superjson|drizzle-orm)[\\/]/.test(id)) return "vendor-data";
          if (/[\\/]node_modules[\\/](@radix-ui|lucide-react|recharts)[\\/]/.test(id)) return "vendor-ui";
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
