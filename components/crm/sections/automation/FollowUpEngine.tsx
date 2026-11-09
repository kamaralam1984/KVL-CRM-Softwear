"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Mail, PhoneCall, Pause, Play, BadgeDollarSign, CheckCircle2, Ban, RefreshCw, Clock, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAccessToken } from "@/lib/security/clientSession";
import {
  getFollowUps, markPaymentReady, markWon, stopFollowUp, pauseFollowUp, runFollowUpsNow,
  type FollowUpSnapshot, type FollowUpRow,
} from "@/lib/actions/followup";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  replied_waiting: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  payment_ready: "bg-[#c9a84c]/15 text-[#c9a84c] border-[#c9a84c]/40",
  won: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  completed: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  stopped: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  paused: "bg-slate-500/10 text-slate-400 border-slate-500/30",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Following up", replied_waiting: "Client replied — awaiting team", payment_ready: "Ready to pay",
  won: "Paid / Won", completed: "90 days done", stopped: "Stopped", paused: "Paused",
};
const CH_ICON = { whatsapp: MessageCircle, email: Mail, call: PhoneCall } as const;

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

export default function FollowUpEngine() {
  const [snap, setSnap] = useState<FollowUpSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "replied_waiting" | "payment_ready">("all");

  const load = useCallback(async () => setSnap(await getFollowUps(getAccessToken())), []);
  useEffect(() => {
    const first = setTimeout(load, 0); // async fetch, not a synchronous setState in the effect body
    const t = setInterval(load, 30_000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); await load(); } finally { setBusy(false); } };

  const counts = useMemo(() => {
    const c = { active: 0, replied_waiting: 0, payment_ready: 0, won: 0 };
    for (const r of snap?.rows ?? []) if (r.status in c) c[r.status as keyof typeof c]++;
    return c;
  }, [snap]);

  const rows = (snap?.rows ?? []).filter((r) => filter === "all" || r.status === filter);
  const token = getAccessToken();

  const runNow = () => act(async () => {
    const r = await runFollowUpsNow(token);
    setNote(r ? `Ran: ${r.steps.sent} sent, ${r.steps.failed} failed, ${r.nudges.nudged} AI nudges` : "Not allowed");
  });

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 text-slate-200">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-sm font-bold text-white">90-Day Follow-up Engine</h2>
          <p className="text-[10px] text-slate-500">WhatsApp + Email + Call · keeps following up until the client is ready to pay · AI soft-nudges after 24h of no team reply</p>
        </div>
        <button onClick={runNow} disabled={busy} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c9a84c]/15 text-[#c9a84c] text-[10px] font-semibold hover:bg-[#c9a84c]/25 disabled:opacity-50">
          <RefreshCw size={11} className={busy ? "animate-spin" : ""} /> Run now
        </button>
      </div>
      {note && <p className="text-[10px] text-emerald-400">{note}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {([
          ["active", "Following up", counts.active, "text-emerald-400"],
          ["replied_waiting", "Awaiting team reply", counts.replied_waiting, "text-amber-400"],
          ["payment_ready", "Ready to pay", counts.payment_ready, "text-[#c9a84c]"],
          ["all", "Paid / Won", counts.won, "text-blue-400"],
        ] as const).map(([key, label, n, color]) => (
          <button key={label} onClick={() => key !== "all" ? setFilter(key as typeof filter) : setFilter("all")}
            className={cn("text-left p-3 rounded-xl border bg-white/[0.02] border-white/[0.06] hover:border-white/20", filter === key && key !== "all" && "border-[#c9a84c]/50")}>
            <div className={cn("text-xl font-bold", color)}>{n}</div>
            <div className="text-[10px] text-slate-500">{label}</div>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] text-[10px] text-slate-400">
          <span>{rows.length} lead{rows.length === 1 ? "" : "s"} {filter !== "all" && `· filter: ${STATUS_LABEL[filter]}`}</span>
          {filter !== "all" && <button className="text-[#c9a84c]" onClick={() => setFilter("all")}>Clear filter</button>}
        </div>
        {!snap ? <p className="p-4 text-[11px] text-slate-500">Loading…</p> : rows.length === 0 ? (
          <p className="p-4 text-[11px] text-slate-500">No leads in the sequence yet. Every new lead is enrolled automatically.</p>
        ) : rows.map((r) => <Row key={r.id} r={r} busy={busy} act={act} token={token} />)}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/[0.06] p-3">
          <h3 className="text-[11px] font-semibold text-white mb-2 flex items-center gap-1.5"><Clock size={12} /> Sequence ({snap?.sequence.steps.length ?? 0} touches)</h3>
          <ol className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {snap?.sequence.steps.map((s, i) => {
              const Icon = CH_ICON[s.channel as keyof typeof CH_ICON] ?? Mail;
              return (
                <li key={i} className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="w-12 text-slate-500">{s.atHours < 24 ? `+${s.atHours}h` : `Day ${Math.round(s.atHours / 24)}`}</span>
                  <Icon size={11} className="text-[#c9a84c]" /> <span className="capitalize">{s.channel}</span>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="rounded-xl border border-white/[0.06] p-3">
          <h3 className="text-[11px] font-semibold text-white mb-2 flex items-center gap-1.5"><Bot size={12} /> Activity</h3>
          <ul className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {(snap?.events ?? []).map((e) => (
              <li key={e.id} className="text-[10px] flex gap-2">
                <span className="text-slate-600 w-24 shrink-0">{fmt(e.created_at)}</span>
                <span className={e.ok ? "text-slate-400" : "text-rose-400"}><b>{e.kind.replace("_", " ")}</b> {e.channel && `· ${e.channel}`} {e.detail && `— ${e.detail}`}</span>
              </li>
            ))}
            {snap && snap.events.length === 0 && <li className="text-[10px] text-slate-600">Nothing yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Row({ r, busy, act, token }: { r: FollowUpRow; busy: boolean; act: (fn: () => Promise<unknown>) => Promise<void>; token?: string }) {
  const done = ["won", "completed", "stopped"].includes(r.status);
  const overdue = (r.waiting_hours ?? 0) >= 24;
  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 border-t border-white/[0.05] text-[11px]">
      <div className="min-w-[140px] flex-1">
        <div className="font-semibold text-white">{r.lead_name}</div>
        <div className="text-[10px] text-slate-500">{r.company || "—"}</div>
      </div>
      <span className={cn("px-2 py-0.5 rounded-md border text-[9px] font-semibold", STATUS_STYLE[r.status])}>{STATUS_LABEL[r.status]}</span>
      <div className="text-[10px] text-slate-500 w-28">Step {Math.min(r.step_index, r.total_steps)}/{r.total_steps}<br />{r.status === "active" && <>Next: {fmt(r.next_run_at)}</>}</div>
      {r.waiting_hours !== null && (
        <span className={cn("text-[10px] font-semibold", overdue ? "text-rose-400" : "text-amber-400")}>
          Waiting {r.waiting_hours}h{overdue && ` · AI nudged ${r.ai_nudge_count}×`}
        </span>
      )}
      {!done && (
        <div className="ml-auto flex gap-1">
          {r.status !== "payment_ready" && <Btn title="Ready to pay" onClick={() => act(() => markPaymentReady(r.lead_id, token))} disabled={busy}><BadgeDollarSign size={12} /></Btn>}
          <Btn title="Paid / Won" onClick={() => act(() => markWon(r.lead_id, token))} disabled={busy}><CheckCircle2 size={12} /></Btn>
          <Btn title={r.status === "paused" ? "Resume" : "Pause"} onClick={() => act(() => pauseFollowUp(r.id, r.status !== "paused", token))} disabled={busy}>{r.status === "paused" ? <Play size={12} /> : <Pause size={12} />}</Btn>
          <Btn title="Stop" onClick={() => act(() => stopFollowUp(r.lead_id, token))} disabled={busy}><Ban size={12} /></Btn>
        </div>
      )}
    </div>
  );
}

function Btn({ title, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} title={title} aria-label={title} className="p-1.5 rounded-md bg-white/[0.04] text-slate-400 hover:text-[#c9a84c] hover:bg-white/[0.08] disabled:opacity-40" />;
}
