"use client";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 9 (Growth & Re-engagement Channels)
// A zero-identity re-engagement channel: the visitor grants a browser
// permission, nothing else. No name/email/phone is ever requested or sent —
// see POST /api/analytics/push-subscribe. Only shown after tracking consent
// is granted (never asks for a second permission before the first is settled),
// and only once — a decline or a subscribe both set a "don't ask again" flag.

import { useEffect, useState } from "react";
import { kvlAnalytics } from "@/lib/tracking/sdk/client";

const CONSENT_KEY = "kvl_consent";
const PROMPTED_KEY = "kvl_push_prompted";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function PushOptIn() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY) return; // feature disabled until VAPID keys are configured
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "default") return;
    try {
      if (localStorage.getItem(PROMPTED_KEY)) return;
      if (localStorage.getItem(CONSENT_KEY) !== "granted") return;
    } catch {
      return;
    }
    setVisible(true);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(PROMPTED_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        dismiss();
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
      await fetch("/api/analytics/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitor_id: kvlAnalytics.getVisitorId(), subscription: subscription.toJSON() }),
        keepalive: true,
      });
      kvlAnalytics.track("push_subscribed");
    } catch {
      /* permission flow can fail for many reasons — degrade silently */
    } finally {
      dismiss();
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[55] max-w-xs px-4 py-4 rounded-2xl border border-white/[0.1] bg-[#0a0e18]/95 backdrop-blur-sm shadow-xl">
      <p className="text-sm text-white font-semibold mb-1">Stay in the loop?</p>
      <p className="text-xs text-slate-400 leading-relaxed mb-3">
        Get notified about offers and updates — no email or phone needed, just a browser permission.
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={dismiss}
          className="px-3 py-1.5 rounded-lg border border-white/[0.1] text-xs text-slate-400 hover:bg-white/[0.04] transition-colors"
        >
          Not now
        </button>
        <button
          onClick={enable}
          disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {busy ? "…" : "Allow"}
        </button>
      </div>
    </div>
  );
}
