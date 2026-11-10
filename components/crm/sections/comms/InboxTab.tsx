"use client";
import { useEffect, useRef, useState } from "react";
import { Check, CheckCheck, AlertTriangle, Paperclip, Zap } from "lucide-react";
import { getInbox, getThread, sendHumanMessage, assignConversationTo, listTeamNames, listTemplates } from "@/lib/actions/comms";
import { Btn, Badge, inputCls, fmt, token, useLoad, s, type Row } from "./ui";

const Tick = ({ status }: { status: string }) =>
  status === "read" ? <CheckCheck size={11} className="text-sky-400" /> : status === "delivered" ? <CheckCheck size={11} className="text-slate-400" />
  : status === "failed" ? <AlertTriangle size={11} className="text-rose-400" /> : status === "mock" ? <span className="text-[8px] text-amber-400">mock</span> : <Check size={11} className="text-slate-500" />;

const paramCount = (body: string) => { const n = [...body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((m) => Number(m[1])); return n.length ? Math.max(...n) : 0; };
/** {{name}} / {{firstName}} in quick replies & templates → the open contact. */
const mergeContact = (t: string, c: Row | null) => {
  const name = s(c?.contact_name).trim();
  const named = name && name !== s(c?.contact_phone) ? name : "";
  return t.replace(/\{\{\s*firstName\s*\}\}/gi, named.split(/\s+/)[0] ?? "").replace(/\{\{\s*name\s*\}\}/gi, named);
};

/** A customer's image / voice note / video / PDF (stored by lib/whatsapp/media.ts, signed URL, no file extension) — try image, then audio, video, else a download link. */
function AutoMedia({ url }: { url: string }) {
  const [mode, setMode] = useState<"image" | "audio" | "video" | "link">("image");
  if (mode === "image") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element -- dynamic signed attachment, not optimisable */}
        <img src={url} alt="attachment" onError={() => setMode("audio")} className="max-h-56 rounded-lg mb-1" />
      </a>
    );
  }
  if (mode === "audio") return <audio src={url} controls onError={() => setMode("video")} className="mb-1 max-w-full" />;
  if (mode === "video") return <video src={url} controls onError={() => setMode("link")} className="max-h-56 rounded-lg mb-1" />;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="text-sky-400 underline text-[10px] block mb-1">📎 Download attachment</a>;
}

export default function InboxTab() {
  const [convs, reloadConvs] = useLoad(() => getInbox(token()), [] as Row[], 6_000);
  const [team] = useLoad(() => listTeamNames(token()), [] as string[]);
  const [quick] = useLoad(() => listTemplates("quick_reply", token()), [] as Row[]);
  const [tpls] = useLoad(() => listTemplates("whatsapp", token()), [] as Row[]);
  const [active, setActive] = useState<Row | null>(null);
  const [thread, setThread] = useState<Row[]>([]);
  const [text, setText] = useState(""), [media, setMedia] = useState(""), [note, setNote] = useState("");
  const [pendingTpl, setPendingTpl] = useState<Row | null>(null), [tplParams, setTplParams] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  // Live thread: poll while a conversation is open and the tab is visible; scroll to the newest message.
  const activeId = s(active?.id);
  useEffect(() => {
    if (!activeId) return;
    const t = setInterval(() => {
      if (document.hidden) return;
      getThread(activeId, token()).then((rows) => setThread((prev) => (rows.length !== prev.length || s(rows.at(-1)?.status) !== s(prev.at(-1)?.status) ? rows : prev))).catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [activeId]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [thread.length]);

  const open = async (c: Row) => { setActive(c); setNote(""); setThread(await getThread(s(c.id), token())); reloadConvs(); };
  const pickTemplate = (t: Row) => {
    const n = paramCount(s(t.body));
    if (n === 0) return send(t, []);
    const first = mergeContact("{{firstName}}", active);
    setPendingTpl(t); setTplParams(Array.from({ length: n }, (_, i) => (i === 0 ? first : "")));
  };
  const send = async (template?: Row, params: string[] = []) => {
    if (!active || (!text.trim() && !media && !template)) return;
    const body = template ? s(template.body).replace(/\{\{\s*(\d+)\s*\}\}/g, (_, i: string) => params[Number(i) - 1] ?? "") : text;
    const r = await sendHumanMessage({
      conversationId: s(active.id), channel: s(active.channel) === "sms" ? "sms" : "whatsapp", phone: s(active.contact_phone), body, mediaUrl: media || undefined,
      template: template?.approved && template.meta_name ? { metaName: s(template.meta_name), language: s(template.language) || "en", params } : undefined,
    }, token());
    setNote(r.ok ? (r.detail ?? "Sent") : `Failed: ${r.detail}`);
    if (r.ok) { setText(""); setMedia(""); setPendingTpl(null); setThread(await getThread(s(active.id), token())); }
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
                  {s(m.media_url) && <AutoMedia url={s(m.media_url)} />}
                  {s(m.body)}
                  <div className="flex items-center justify-end gap-1 mt-0.5 text-[8px] text-slate-500">
                    {m.direction === "outbound" && s(m.sent_by) && s(m.sent_by) !== "human" && <span className="uppercase">{s(m.sent_by)}</span>}
                    {fmt(m.created_at)} {m.direction === "outbound" && <Tick status={s(m.status)} />}
                  </div>
                  {s(m.error) && <div className="text-[9px] text-rose-400">{s(m.error)}</div>}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="border-t border-white/[0.06] p-2 space-y-1.5">
            {quick.length > 0 && <div className="flex flex-wrap gap-1">{quick.map((q) => <button key={s(q.id)} onClick={() => setText(mergeContact(s(q.body), active))} className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[10px] text-slate-300 hover:bg-white/[0.1] flex items-center gap-1"><Zap size={9} />{s(q.name)}</button>)}</div>}
            <textarea className={inputCls} rows={2} placeholder="Type a reply…" value={text} onChange={(e) => setText(e.target.value)} />
            <div className="flex gap-1.5 items-center">
              <div className="flex items-center gap-1 flex-1"><Paperclip size={11} className="text-slate-500" /><input className={inputCls} placeholder="Image / PDF link (optional)" value={media} onChange={(e) => setMedia(e.target.value)} /></div>
              {tpls.filter((t) => t.approved).length > 0 && (
                <select className="bg-[#0a1628] border border-white/[0.08] rounded-md text-[10px] text-slate-300 px-2 py-2" value="" onChange={(e) => { const t = tpls.find((x) => x.id === e.target.value); if (t) pickTemplate(t); }}>
                  <option value="">Send template…</option>{tpls.filter((t) => t.approved).map((t) => <option key={s(t.id)} value={s(t.id)}>{s(t.name)}</option>)}
                </select>)}
              <Btn tone="gold" onClick={() => send()}>Send</Btn>
            </div>
            {pendingTpl && (
              <div className="rounded-lg border border-[#c9a84c]/30 bg-[#c9a84c]/[0.05] p-2 space-y-1.5">
                <p className="text-[10px] text-slate-300 whitespace-pre-wrap">{s(pendingTpl.body)}</p>
                {tplParams.map((v, i) => <input key={i} className={inputCls} placeholder={`Value for {{${i + 1}}}`} value={v} onChange={(e) => setTplParams((p) => p.map((x, j) => (j === i ? e.target.value : x)))} />)}
                <div className="flex gap-1.5"><Btn tone="gold" disabled={tplParams.some((v) => !v.trim())} onClick={() => send(pendingTpl, tplParams)}>Send template</Btn><Btn onClick={() => setPendingTpl(null)}>Cancel</Btn></div>
              </div>
            )}
            {note && <p className="text-[10px] text-slate-400">{note}</p>}
          </div>
        </>)}
      </div>
    </div>
  );
}
