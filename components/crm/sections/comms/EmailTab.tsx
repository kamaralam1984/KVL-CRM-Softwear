"use client";
import { useState } from "react";
import { getEmailThreads, getEmailThread, sendEmailReply } from "@/lib/actions/comms";
import { Btn, Badge, inputCls, fmt, token, useLoad, s, type Row } from "./ui";

export default function EmailTab() {
  const [threads, reload] = useLoad(() => getEmailThreads(token()), [] as Row[], 20_000);
  const [key, setKey] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Row[]>([]);
  const [subject, setSubject] = useState(""), [body, setBody] = useState(""), [note, setNote] = useState("");
  const open = async (k: string, subj: string) => { setKey(k); setSubject(subj.startsWith("Re:") ? subj : `Re: ${subj}`); setMsgs(await getEmailThread(k, token())); };
  const send = async () => {
    if (!key || !body.trim()) return;
    const r = await sendEmailReply(key, subject, body, token());
    setNote(r.ok ? "Sent" : `Failed: ${r.detail}`);
    if (r.ok) { setBody(""); setMsgs(await getEmailThread(key, token())); reload(); }
  };
  const tone = (st: string) => st === "bounced" || st === "complained" || st === "failed" ? "red" : st === "delivered" || st === "received" ? "green" : st === "mock" ? "amber" : "slate";
  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-3 min-h-[420px]">
      <div className="rounded-xl border border-white/[0.06] overflow-y-auto max-h-[70vh]">
        {threads.length === 0 && <p className="p-3 text-[11px] text-slate-500">No emails yet. Outbound emails and replies appear here (inbound needs the Resend webhook — see docs).</p>}
        {threads.map((t) => (
          <button key={s(t.id)} onClick={() => open(s(t.thread_key), s(t.subject))} className={`w-full text-left px-3 py-2 border-b border-white/[0.04] hover:bg-white/[0.04] ${key === t.thread_key ? "bg-white/[0.06]" : ""}`}>
            <div className="text-[11px] font-semibold text-white truncate">{s(t.thread_key)}</div>
            <div className="text-[10px] text-slate-400 truncate">{t.direction === "inbound" ? "↩ " : "→ "}{s(t.subject)}</div>
            <div className="flex gap-1.5 text-[9px] text-slate-500 items-center">{fmt(t.created_at)}<Badge tone={tone(s(t.status))}>{s(t.status)}</Badge>{Number(t.opens) > 0 && <span>👁 {s(t.opens)}</span>}{Number(t.clicks) > 0 && <span>🔗 {s(t.clicks)}</span>}</div>
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-white/[0.06] flex flex-col">
        {!key ? <p className="m-auto text-[11px] text-slate-500">Select an email thread</p> : (<>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[48vh]">
            {msgs.map((m) => (
              <div key={s(m.id)} className={`rounded-xl p-2.5 text-[11px] ${m.direction === "outbound" ? "bg-[#c9a84c]/10 ml-8" : "bg-white/[0.05] mr-8"}`}>
                <div className="flex justify-between text-[9px] text-slate-500 mb-1"><b>{s(m.subject)}</b><span>{fmt(m.created_at)} · {s(m.status)}{Number(m.opens) > 0 && ` · opened ${s(m.opens)}×`}{Number(m.clicks) > 0 && ` · clicked ${s(m.clicks)}×`}</span></div>
                <div className="whitespace-pre-wrap text-slate-200">{s(m.body).replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.06] p-2 space-y-1.5">
            <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} />
            <textarea className={inputCls} rows={3} placeholder="Write your reply…" value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="flex items-center gap-2"><Btn tone="gold" onClick={send}>Send reply</Btn>{note && <span className="text-[10px] text-slate-400">{note}</span>}</div>
          </div>
        </>)}
      </div>
    </div>
  );
}
