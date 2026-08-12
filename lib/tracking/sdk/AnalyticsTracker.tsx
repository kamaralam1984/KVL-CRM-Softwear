"use client";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 1 (Foundation)
// Mount once per public marketing page/layout. Initializes the SDK and fires
// a page() call on every route change (App Router navigation).

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { kvlAnalytics } from "./client";

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      kvlAnalytics.init();
      initialized.current = true;
    }
    kvlAnalytics.page();
  }, [pathname]);

  return null;
}
