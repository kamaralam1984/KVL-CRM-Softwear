"use client";
import { useState } from "react";
import { Check, CheckCheck, AlertTriangle, Paperclip, Zap } from "lucide-react";
import { getInbox, getThread, sendHumanMessage, assignConversationTo, listTeamNames, listTemplates } from "@/lib/actions/comms";
import { Btn, Badge, inputCls, fmt, token, useLoad, s, type Row } from "./ui";

const Tick = ({ status }: { status: string }) =>
  status === "read" ? <CheckCheck size={11} className="text-sky-400" /> : status === "delivered" ? <CheckCheck size={11} className="text-slate-400" />
  : status === "failed" ? <AlertTriangle size={11} className="text-rose-400" /> : status === "mock" ? <span className="text-[8px] text-amber-400">mock</span> : <Check size={11} className="text-slate-500" />;

export default function InboxTab() {
  const [convs, reloadConvs] = useLoad(() => getInbox(token()), [] as Row[], 15_000);
  const [team] = useLoad(() => listTeamNames(token()), [] as string[]);
  const [quick] = useLoad(() => listTemplates("quick_reply", token()), [] as Row[]);
  const [tpls] = useLoad(() => listTemplates("whatsapp", token()), [] as Row[]);
  const [active, setActive] = useState<Row | null>(null);
  const [thread, setThread] = useState<Row[]>([]);
  const [text, setText] = useState(""), [media, setMedia] = useState(""), [note, setNote] = useState("");

  const open = async (c: Row) => { setActive(c); setNote(""); setThread(await getThread(s(c.id), token())); reloadConvs(); };
  const send = async (template?: Row) => {
    if (!active || (!text.trim() && !media && !template)) return;
    const body = template ? s(template.body) : text;
    const r = await sendHumanMessage({
      conversationId: s(active.id), channel: s(active.channel) === "sms" ? "sms" : "whatsapp", phone: s(active.contact_phone), body, mediaUrl: media || undefined,
      template: template?.approved && template.meta_name ? { metaName: s(template.meta_name), language: s(template.language) || "en", params: [] } : undefined,
    }, token());
    setNote(r.ok ? (r.detail ?? "Sent") : `Failed: ${r.detail}`);
    if (r.ok) { setText(""); setMedia(""); setThread(await getThread(s(active.id), token())); }
  };

  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-3 h-full min-h-[420px]">
      <div className="rounded-xl border border-white/[0.06] overflow-y-auto max-h-[70vh]">
        {convs.length === 0 && <p className="p-3 text-[11px] text-slate-500">No conversations yet.</p>}
        {convs.map((c) => (
          <button key={s(c.id)} onClick={() => open(c)} className={`w-full text-left px-3 py-2 border-b border-white/[0.04] hover:bg-white/[0.04] ${active?.id === c.id ? "bg-white/[0.06]" : ""}`}>
            <div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-white truncate">{s(c.contact_name) || s(c.contact_phone)}</span>
              {Number(c.unread_count) > 0 && <Badge tone="gold">{s(c.unread_count)}</Badge>}</div>
            <div className="text-[9px] text-slate-500 flex gap-2"><span className="capitalize">{s(c.channel)}</span><span>{fmt(c.last_message_at)}</span>{s(c.assigned_to) && <span>→ {s(c.assigned_to)}</span>}</div>
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-white/[0.06] flex flex-col">
        {!active ? <p className="m-auto text-[11px] text-slate-500">Select a conversation</p> : (<>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
            <span className="text-[11px] font-semibold text-white">{s(active.contact_name) || s(active.contact_phone)}</span><span className="text-[10px] text-slate-500">{s(active.contact_phone)}</span>
            <select className="ml-auto bg-[#0a1628] border border-white/[0.08] rounded-md text-[10px] text-slate-300 px-2 py-1" value={s(active.assigned_to)}
              onChange={async (e) => { await assignConversationTo(s(active.id), e.target.value, token()); setActive({ ...active, assigned_to: e.target.value }); reloadConvs(); }}>
              <option value="">Unassigned</option>{team.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[45vh]">
            {thread.map((m) => (
              <div key={s(m.id)} className={`flex ${m.direction === "outbound" ? "justify-end" : ""}`}>
                <div className={`max-w-[75%] px-2.5 py-1.5 rounded-xl text-[11px] whitespace-pre-wrap ${m.direction === "outbound" ? "bg-[#c9a84c]/15 text-slate-100" : "bg-white/[0.06] text-slate-200"}`}>
                  {s(m.body)}
                  <div className="flex items-center justify-end gap-1 mt-0.5 text-[8px] text-slate-500">
                    {m.direction === "outbound" && s(m.sent_by) && s(m.sent_by) !== "human" && <span className="uppercase">{s(m.sent_by)}</span>}
                    {fmt(m.created_at)} {m.direction === "outbound" && <Tick status={s(m.status)} />}
                  </div>
                  {s(m.error) && <div className="text-[9px] text-rose-400">{s(m.error)}</div>}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.06] p-2 space-y-1.5">
            {quick.length > 0 && <div className="flex flex-wrap gap-1">{quick.map((q) => <button key={s(q.id)} onClick={() => setText(s(q.body))} className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[10px] text-slate-300 hover:bg-white/[0.1] flex items-center gap-1"><Zap size={9} />{s(q.name)}</button>)}</div>}
            <textarea className={inputCls} rows={2} placeholder="Type a reply…" value={text} onChange={(e) => setText(e.target.value)} />
            <div className="flex gap-1.5 items-center">
              <div className="flex items-center gap-1 flex-1"><Paperclip size={11} className="text-slate-500" /><input className={inputCls} placeholder="Image / PDF link (optional)" value={media} onChange={(e) => setMedia(e.target.value)} /></div>
              {tpls.filter((t) => t.approved).length > 0 && (
                <select className="bg-[#0a1628] border border-white/[0.08] rounded-md text-[10px] text-slate-300 px-2 py-2" value="" onChange={(e) => { const t = tpls.find((x) => x.id === e.target.value); if (t) send(t); }}>
                  <option value="">Send template…</option>{tpls.filter((t) => t.approved).map((t) => <option key={s(t.id)} value={s(t.id)}>{s(t.name)}</option>)}
                </select>)}
              <Btn tone="gold" onClick={() => send()}>Send</Btn>
            </div>
            {note && <p className="text-[10px] text-slate-400">{note}</p>}
          </div>
        </>)}
      </div>
    </div>
  );
}
