"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";

type RunResult = {
  ok?: boolean;
  sourced?: number;
  afterDedupe?: number;
  saved?: number;
  usedMockData?: boolean;
  outreach?: { length: number };
  error?: string;
};

export default function GenerateLeadsButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  async function generate() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/leadgen/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Keep the manual run snappy: generate + queue call tasks (instant).
        // The daily cron does the full email/WhatsApp outreach.
        body: JSON.stringify({
          outreach: {
            channels: ["call"],
            sender: {
              senderName: "Animesh",
              senderCompany: "FreedomWithAI",
              offer: "An AI CRM that finds and follows up with leads automatically",
            },
          },
        }),
      });
      const data = (await res.json()) as RunResult;
      setResult(data);
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  const outreachCount = Array.isArray(result?.outreach) ? result!.outreach.length : 0;

  return (
    <div className="relative">
      <motion.button
        onClick={generate}
        disabled={loading}
        whileHover={{ scale: loading ? 1 : 1.03 }}
        whileTap={{ scale: loading ? 1 : 0.97 }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-bg text-white text-xs font-semibold shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
        style={{ boxShadow: "0 0 24px rgba(59,130,246,0.35)" }}
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Finding leads…
          </>
        ) : (
          <>
            <Sparkles size={14} />
            Generate Leads Now
          </>
        )}
      </motion.button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            className="absolute right-0 mt-2 w-72 z-50 glass-card rounded-2xl border border-crm-border p-4 shadow-2xl"
            style={{ background: "linear-gradient(135deg,#0d1425 0%,#0a0f1c 100%)" }}
          >
            <button
              onClick={() => setResult(null)}
              className="absolute top-2.5 right-2.5 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={13} />
            </button>

            {result.error ? (
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-rose-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-100">Generation failed</p>
                  <p className="text-[11px] text-slate-500 mt-1 break-words">{result.error}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <p className="text-xs font-bold text-slate-100">Lead run complete</p>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <Row label="Sourced" value={result.sourced ?? 0} color="text-slate-300" />
                  <Row label="After dedupe" value={result.afterDedupe ?? 0} color="text-slate-300" />
                  <Row label="Saved to CRM" value={result.saved ?? 0} color="text-emerald-400" />
                  <Row label="Outreach actions" value={outreachCount} color="text-blue-400" />
                </div>
                {result.usedMockData && (
                  <p className="mt-3 text-[10px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5 leading-relaxed">
                    Demo data — add GOOGLE_MAPS_API_KEY & live Supabase for real leads.
                  </p>
                )}
                {!result.usedMockData && result.saved === 0 && (
                  <p className="mt-3 text-[10px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5 leading-relaxed">
                    Saved 0 — connect live Supabase env to persist leads.
                  </p>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}
