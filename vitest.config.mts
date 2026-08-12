import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 8 (Security Hardening + Tests)
// Unit tests only this wave — pure functions, no React components — so a plain
// node environment is enough (no jsdom). Alias mirrors tsconfig.json's "@/*".
// .mts (not .ts) so Vitest loads this as native ESM without a CJS warning.
const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "."),
    },
  },
});
