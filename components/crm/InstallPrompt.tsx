"use client";
// Phase 34 — PWA install prompt for the CRM app shell. Listens for the
// browser's own `beforeinstallprompt` event (Chrome/Edge/Android) — never
// fires on browsers that don't support installable PWAs (notably iOS
// Safari, which has no such event; those users install via the native
// "Add to Home Screen" share-sheet action instead, nothing to code here).

import { useEffect, useState } from "react";

const DISMISSED_KEY = "kvl_install_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return;
    } catch {
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => {});
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[55] max-w-xs px-4 py-3 rounded-2xl border border-white/[0.1] bg-[#0a0e18]/95 backdrop-blur-sm shadow-xl flex items-center gap-3">
      <div className="flex-1">
        <p className="text-xs text-white font-semibold">Install KVl CRM</p>
        <p className="text-[10px] text-slate-400">Add to your device for one-tap access.</p>
      </div>
      <button onClick={dismiss} className="text-[10px] text-slate-500 hover:text-slate-300 px-1">Later</button>
      <button onClick={install} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-black" style={{ background: "linear-gradient(135deg,#D4AF37,#F5C842)" }}>
        Install
      </button>
    </div>
  );
}
