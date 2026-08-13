"use client";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 9 (Growth & Re-engagement Channels)
// Renders only when NEXT_PUBLIC_TRUECALLER_PARTNER_KEY is configured — a
// missing Partner Key means the feature is inert, not broken (fail-soft,
// same convention as PushOptIn). Truecaller shows its own consent screen
// before sharing anything; the actual token verification happens server-side
// in /api/analytics/truecaller-callback, never trusting the client.

import { kvlAnalytics } from "@/lib/tracking/sdk/client";

export default function TruecallerButton() {
  if (!process.env.NEXT_PUBLIC_TRUECALLER_PARTNER_KEY) return null;

  function verify() {
    kvlAnalytics.track("truecaller_click");
    const state = encodeURIComponent(kvlAnalytics.getVisitorId());
    window.location.href = `/api/analytics/truecaller-authorize?state=${state}`;
  }

  return (
    <button
      type="button"
      onClick={verify}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/[0.12] bg-white/[0.03] text-sm font-semibold text-slate-200 hover:bg-white/[0.06] hover:border-blue-500/40 transition-colors"
    >
      <span aria-hidden>📱</span> Continue with Truecaller
    </button>
  );
}
