"use client";
// Phase 39 — Next.js's documented top-level error boundary: catches errors
// the root layout itself can't render around. Must render its own <html>/
// <body> since it replaces the whole tree on error. Reports to Sentry only
// when configured (see instrumentation.ts) — always logs to console either
// way, never throws itself.

import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error("[global-error]", error);
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error)).catch(() => {});
    }
  }, [error]);

  return (
    <html>
      <body style={{ background: "#080c14", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", maxWidth: 420 }}>
            We&apos;ve logged this and will look into it. Please refresh the page or try again in a moment.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 8, padding: "8px 16px", borderRadius: 10, background: "#D4AF37", color: "#000", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer" }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
