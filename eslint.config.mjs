import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Phase 44 — a standalone plain-Node script deployed as its own PM2
    // process, not part of the Next.js app bundle (same reasoning as
    // android/**, ios/** being outside the TS/lint globs already).
    "voice-relay/**",
  ]),
]);

export default eslintConfig;
