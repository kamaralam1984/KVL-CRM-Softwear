"use client";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 1 (Foundation)
// Mount once per public marketing page/layout. Initializes the SDK and fires
// a page() call on every route change (App Router navigation).
//
// Wave 10 (Multi-Tenant Embed) — `siteId` is optional and defaults to KVL's
// own bootstrap site, so every existing `<AnalyticsTracker />` call site
// (contact/pricing/quiz layouts) needs zero changes.

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { kvlAnalytics } from "./client";

export default function AnalyticsTracker({ siteId }: { siteId?: string } = {}) {
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      kvlAnalytics.init(siteId);
      initialized.current = true;
    }
    kvlAnalytics.page();
  }, [pathname, siteId]);

  return null;
}
