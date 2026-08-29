import type { CapacitorConfig } from "@capacitor/cli";

// Phase 38 — Native App Shell. Remote/hybrid mode: the native WebView loads
// the LIVE production site rather than a static bundle. This is the only
// viable approach here — the app has 39 app/api/**/route.ts handlers
// (webhooks, OAuth callbacks, cron) and 45 "use server" files, so a fully
// static `next export` (which Capacitor's default local-bundle mode needs)
// is not possible without a ground-up rewrite, which would violate this
// codebase's extend-only house style. This config wraps
// crm.kvlbusinesssolutions.com as an installable native binary; it does not
// bundle the app's JS/HTML locally, so it always reflects whatever is live
// in production, and every existing web feature works identically inside it.
const config: CapacitorConfig = {
  appId: "com.kvlbusinesssolutions.crm",
  appName: "Maxness",
  webDir: "public",
  server: {
    url: "https://crm.kvlbusinesssolutions.com",
    cleartext: false,
  },
};

export default config;
