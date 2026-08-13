"use client";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 9 (Growth & Re-engagement Channels)
// Dialing a number and letting caller ID come through is an inherently
// voluntary act — no different from a phone call to any business. The number
// is admin-configured (Admin Panel → Acquisition Engine → Growth Channels);
// this renders nothing until one is set. Actual call capture happens via a
// telephony provider's webhook to POST /api/telephony/missed-call.

import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { getAcquisitionSettings } from "@/lib/actions/acquisitionSettings";
import { kvlAnalytics } from "@/lib/tracking/sdk/client";

export default function MissedCallBanner() {
  const [number, setNumber] = useState("");

  useEffect(() => {
    getAcquisitionSettings().then((s) => setNumber(s.missed_call_number || ""));
  }, []);

  if (!number) return null;

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
      <h3 className="text-sm font-bold text-white mb-1">Prefer a Quick Call?</h3>
      <p className="text-xs text-slate-400 mb-3">Give us a missed call — we&apos;ll call you right back, no form needed.</p>
      <a
        href={`tel:${number.replace(/[^0-9+]/g, "")}`}
        onClick={() => kvlAnalytics.track("missed_call_click")}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <Phone size={14} /> {number}
      </a>
    </div>
  );
}
