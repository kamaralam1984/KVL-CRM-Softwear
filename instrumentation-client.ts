// Phase 39 — client-side counterpart to instrumentation.ts's server init.
// Next.js auto-loads this file when it exists; only initializes when
// NEXT_PUBLIC_SENTRY_DSN is set, silently no-ops otherwise.

import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 0 });
}
