"use client";
import { useState } from "react";
import { loadCommsSettings, saveCommsSettings, listSuppressions, addDnc, removeDnc } from "@/lib/actions/comms";
import type { CommsSettings } from "@/lib/comms/settings";
import { Btn, Card, Badge, Field, inputCls, fmt, token, useLoad, s, type Row } from "./ui";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SettingsTab() {
  const [loaded] = useLoad(() => loadCommsSettings(token()), null as CommsSettings | null);
  const [edit, setEdit] = useState<CommsSettings | null>(null);
  const cfg = edit ?? loaded;
  const [dnc, reloadDnc] = useLoad(() => listSuppressions(token()), [] as Row[]);
  const [msg, setMsg] = useState(""), [nd, setNd] = useState({ phone: "", email: "", reason: "" });
  if (!cfg) return <p className="text-[11px] text-slate-500">Loading…</p>;
  const up = (fn: (c: CommsSettings) => CommsSettings) => setEdit(fn(JSON.parse(JSON.stringify(cfg))));
  const save = async () => { const ok = await saveCommsSettings(cfg, token()); setMsg(ok ? "Saved" : "Save failed"); };
  const h = cfg.business_hours;

  return (
    <div className="grid lg:grid-cols-2 gap-3">
      <div className="space-y-3">
        <Card title="Links used in messages ({{bookingLink}} / {{paymentLink}})">
          <div className="space-y-2"><Field label="Booking link (Calendly / Cal.com / Google)"><input className={inputCls} value={cfg.links.bookingLink} onChange={(e) => up((c) => ({ ...c, links: { ...c.links, bookingLink: e.target.value } }))} /></Field>
            <Field label="Payment link (used when a client says they're ready to pay; a unique Razorpay link is created instead when the lead has a deal value and Razorpay keys are set)"><input className={inputCls} value={cfg.links.paymentLink} onChange={(e) => up((c) => ({ ...c, links: { ...c.links, paymentLink: e.target.value } }))} /></Field></div></Card>
        <Card title="Team alerts (instant, on client reply / payment intent / failures)">
          <div className="grid grid-cols-2 gap-2"><Field label="Alert WhatsApp number"><input className={inputCls} value={cfg.team_alerts.whatsapp} onChange={(e) => up((c) => ({ ...c, team_alerts: { ...c.team_alerts, whatsapp: e.target.value } }))} /></Field>
            <Field label="Alert email"><input className={inputCls} value={cfg.team_alerts.email} onChange={(e) => up((c) => ({ ...c, team_alerts: { ...c.team_alerts, email: e.target.value } }))} /></Field></div></Card>
        <Card title="Business hours &amp; auto-reply">
          <label className="flex items-center gap-2 text-[11px] text-slate-300 mb-2"><input type="checkbox" checked={h.enabled} onChange={(e) => up((c) => ({ ...c, business_hours: { ...c.business_hours, enabled: e.target.checked } }))} />Send an auto-reply outside business hours</label>
          <div className="grid grid-cols-3 gap-2"><Field label="Opens"><input className={inputCls} value={h.start} onChange={(e) => up((c) => ({ ...c, business_hours: { ...c.business_hours, start: e.target.value } }))} /></Field>
            <Field label="Closes"><input className={inputCls} value={h.end} onChange={(e) => up((c) => ({ ...c, business_hours: { ...c.business_hours, end: e.target.value } }))} /></Field>
            <Field label="UTC offset (min, IST=330)"><input className={inputCls} type="number" value={h.tzOffsetMin} onChange={(e) => up((c) => ({ ...c, business_hours: { ...c.business_hours, tzOffsetMin: Number(e.target.value) } }))} /></Field></div>
          <div className="flex gap-1 my-2">{DAYS.map((d, i) => <button key={d} onClick={() => up((c) => ({ ...c, business_hours: { ...c.business_hours, days: c.business_hours.days.includes(i) ? c.business_hours.days.filter((x) => x !== i) : [...c.business_hours.days, i] } }))} className={`px-2 py-1 rounded-md text-[10px] ${h.days.includes(i) ? "bg-[#c9a84c] text-black" : "bg-white/[0.05] text-slate-400"}`}>{d}</button>)}</div>
          <Field label="Off-hours message ({{opens}} = next opening time)"><textarea className={inputCls} rows={2} value={cfg.auto_reply.offHoursText} onChange={(e) => up((c) => ({ ...c, auto_reply: { ...c.auto_reply, offHoursText: e.target.value } }))} /></Field></Card>
        <Card title="AI auto-answer (WhatsApp/SMS)">
          <label className="flex items-center gap-2 text-[11px] text-slate-300 mb-2"><input type="checkbox" checked={cfg.ai_answer.enabled} onChange={(e) => up((c) => ({ ...c, ai_answer: { enabled: e.target.checked } }))} />Let AI answer common questions using the knowledge base below</label>
          <Field label="Knowledge base — services, prices, FAQs (AI uses ONLY this; it never invents facts)"><textarea className={inputCls} rows={6} value={cfg.knowledge_base.text} onChange={(e) => up((c) => ({ ...c, knowledge_base: { text: e.target.value } }))} /></Field></Card>
        <div className="flex items-center gap-2"><Btn tone="gold" onClick={save}>Save settings</Btn>{msg && <span className="text-[10px] text-slate-400">{msg}</span>}</div>
      </div>
      <Card title={`Do-Not-Contact list (${dnc.length})`}>
        <p className="text-[10px] text-slate-500 mb-2">Added automatically on STOP replies, unsubscribe clicks, hard bounces, spam complaints and &quot;do not call&quot; outcomes. Every WhatsApp / SMS / email / call checks this list first.</p>
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5 mb-2"><input className={inputCls} placeholder="Phone" value={nd.phone} onChange={(e) => setNd({ ...nd, phone: e.target.value })} /><input className={inputCls} placeholder="Email" value={nd.email} onChange={(e) => setNd({ ...nd, email: e.target.value })} /><input className={inputCls} placeholder="Reason" value={nd.reason} onChange={(e) => setNd({ ...nd, reason: e.target.value })} />
          <Btn tone="gold" disabled={!nd.phone && !nd.email} onClick={async () => { await addDnc({ phone: nd.phone, email: nd.email }, nd.reason, token()); setNd({ phone: "", email: "", reason: "" }); reloadDnc(); }}>Add</Btn></div>
        <div className="max-h-[55vh] overflow-y-auto space-y-1">{dnc.map((d) => (
          <div key={s(d.id)} className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/[0.03] text-[10px]"><span className="text-slate-200 flex-1 truncate">{s(d.phone) || s(d.email)}</span><Badge tone="slate">{s(d.source) || "manual"}</Badge><span className="text-slate-500">{fmt(d.created_at)}</span>
            <button className="text-rose-400" onClick={async () => { await removeDnc({ phone: s(d.phone), email: s(d.email) }, token()); reloadDnc(); }}>Remove</button></div>))}</div>
      </Card>
    </div>
  );
}
