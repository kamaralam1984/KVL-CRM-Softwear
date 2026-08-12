"use client";
// Phase 17 — Lead Intelligence & Acquisition Engine (post-Wave-8 gap check)
// Minimal first-party consent banner. Spec §25 wants a real consent UI; the
// SDK's setConsent() / POST /api/analytics/consent were fully built in Wave 1
// but had no caller anywhere in the product until this component. The SDK
// already runs anonymous, PII-free analytics by default (an initial page_view
// can fire before this banner is answered) — declining here stops all future
// tracking; it does not retroactively purge anything already sent, since
// nothing personally identifying was ever in it.

import { useEffect, useState } from "react";
import { kvlAnalytics } from "./client";

const CONSENT_KEY = "kvl_consent";

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
    } catch {
      /* localStorage unavailable — skip the banner rather than crash */
    }
  }, []);

  function choose(status: "granted" | "denied") {
    kvlAnalytics.setConsent(status);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] px-4 py-4 border-t border-white/[0.08] bg-[#05080f]/95 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
        <p className="text-xs text-slate-400 flex-1 leading-relaxed">
          We use first-party, anonymous analytics to understand how visitors use this site. No personal
          data is collected unless you voluntarily submit a form. See our{" "}
          <a href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</a>.
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => choose("denied")}
            className="px-4 py-2 rounded-xl border border-white/[0.1] text-xs text-slate-400 hover:bg-white/[0.04] transition-colors"
          >
            Decline
          </button>
          <button
            onClick={() => choose("granted")}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
