import { defineConfig } from "vitest/config";
import path from "node:path";

// Vitest needs the same path aliases as tsconfig (Next resolves these at build
// time via the TS plugin, but Vitest runs outside Next).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@config": path.resolve(__dirname, "./config"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
