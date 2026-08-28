// Phase 39 — Production Hardening & Observability. Next.js's documented
// server-startup hook (enabled by default since Next 15, no experimental
// flag needed). Only initializes Sentry when NEXT_PUBLIC_SENTRY_DSN is set
// — silently no-ops otherwise, matching the "real API when key present else
// mock, never throw" convention applied to observability instead of a
// business integration. tracesSampleRate: 0 — error capture only, no
// performance-tracing overhead (out of scope for this phase).

export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 0 });
  }
}
