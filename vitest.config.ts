import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "apps/frontend-angular", "src"),
      "@shared": path.resolve(templateRoot, "src/c2/shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: [
      "src/c2/server/**/*.test.ts",
      "src/c2/server/**/*.spec.ts",
      "apps/frontend-angular/**/*.test.ts",
      "apps/frontend-angular/**/*.spec.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: ["**/*.d.ts", "**/*.test.ts", "**/*.spec.ts"],
    },
  },
});
