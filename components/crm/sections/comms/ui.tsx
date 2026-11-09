"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getAccessToken } from "@/lib/security/clientSession";

export const token = () => getAccessToken();
export const inputCls = "w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-[#c9a84c]/50";
export const fmt = (iso?: unknown) => (iso ? new Date(String(iso)).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

/** Loads data on mount (async — no synchronous setState in the effect) and optionally polls. */
export function useLoad<T>(fn: () => Promise<T>, initial: T, pollMs = 0) {
  const [data, setData] = useState<T>(initial);
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  const reload = useCallback(async () => { try { setData(await ref.current()); } catch { /* keep previous data */ } }, []);
  useEffect(() => {
    const first = setTimeout(reload, 0);
    const t = pollMs ? setInterval(reload, pollMs) : undefined;
    return () => { clearTimeout(first); if (t) clearInterval(t); };
  }, [reload, pollMs]);
  return [data, reload] as const;
}

export function Btn({ tone = "ghost", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "gold" | "ghost" | "danger" }) {
  return <button {...p} className={cn("px-3 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-40 transition-colors",
    tone === "gold" ? "bg-[#c9a84c] text-black hover:opacity-90" : tone === "danger" ? "bg-rose-500/15 text-rose-400 hover:bg-rose-500/25" : "bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]", className)} />;
}

export function Card({ title, children, right, className }: { title?: string; children: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-white/[0.06] bg-white/[0.02] p-3", className)}>
      {(title || right) && <div className="flex items-center justify-between mb-2"><h3 className="text-[11px] font-semibold text-white">{title}</h3>{right}</div>}
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[10px] text-slate-500 mb-1 block">{label}</span>{children}</label>;
}

export const Badge = ({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "amber" | "red" | "gold" | "blue" }) => (
  <span className={cn("px-1.5 py-0.5 rounded-md text-[9px] font-semibold border",
    tone === "green" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", tone === "amber" && "bg-amber-500/10 text-amber-400 border-amber-500/30",
    tone === "red" && "bg-rose-500/10 text-rose-400 border-rose-500/30", tone === "gold" && "bg-[#c9a84c]/15 text-[#c9a84c] border-[#c9a84c]/40",
    tone === "blue" && "bg-blue-500/10 text-blue-400 border-blue-500/30", tone === "slate" && "bg-slate-500/10 text-slate-400 border-slate-500/30")}>{children}</span>
);

export type Row = Record<string, unknown>;
export const s = (v: unknown) => (v == null ? "" : String(v));
