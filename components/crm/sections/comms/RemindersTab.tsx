"use client";
import { useState } from "react";
import { listReminders, addReminder, cancelReminder } from "@/lib/actions/comms";
import { Btn, Card, Badge, Field, inputCls, fmt, token, useLoad, s, type Row } from "./ui";

export default function RemindersTab() {
  const [rows, reload] = useLoad(() => listReminders(token()), [] as Row[], 30_000);
  const [f, setF] = useState({ title: "", body: "", at: "", audience: "team" as "team" | "client", assignee: "", phone: "", email: "" });
  const [msg, setMsg] = useState("");
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const add = async () => { const ok = await addReminder({ title: f.title, body: f.body, atIso: new Date(f.at).toISOString(), audience: f.audience, assignee: f.assignee, phone: f.phone, email: f.email }, token()); setMsg(ok ? "Reminder set" : "Failed"); if (ok) { setF({ ...f, title: "", body: "" }); reload(); } };
  const tone = (st: string) => st === "sent" ? "green" : st === "failed" ? "red" : st === "pending" ? "gold" : "slate";
  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-3">
      <Card title="Reminders (auto-created from tasks, meetings, invoices, callbacks)">
        <div className="space-y-1 max-h-[65vh] overflow-y-auto">
          {rows.length === 0 && <p className="text-[11px] text-slate-500">Nothing scheduled yet. Tasks with a due date, calendar events with a client phone/email, and invoices with a contact create reminders automatically.</p>}
          {rows.map((r) => (
            <div key={s(r.id)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03] text-[11px]">
              <Badge tone={tone(s(r.status))}>{s(r.status)}</Badge><Badge tone="slate">{s(r.kind)}</Badge><Badge tone={r.audience === "client" ? "blue" : "slate"}>{s(r.audience)}</Badge>
              <div className="flex-1 min-w-0"><div className="text-white truncate">{s(r.title)}</div>{s(r.error) && <div className="text-[9px] text-amber-400">{s(r.error)}</div>}</div>
              <span className="text-[9px] text-slate-500">{fmt(r.remind_at)}</span>
              {r.status === "pending" && <Btn tone="danger" onClick={async () => { await cancelReminder(s(r.id), token()); reload(); }}>Cancel</Btn>}
            </div>
          ))}
        </div>
      </Card>
      <Card title="New reminder">
        <div className="space-y-2">
          <Field label="Who gets it"><select className={inputCls} value={f.audience} onChange={(e) => set("audience", e.target.value)}><option value="team">Team member</option><option value="client">Client (WhatsApp/email)</option></select></Field>
          <Field label="Title"><input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label="Message"><textarea className={inputCls} rows={2} value={f.body} onChange={(e) => set("body", e.target.value)} /></Field>
          <Field label="When"><input type="datetime-local" className={inputCls} value={f.at} onChange={(e) => set("at", e.target.value)} /></Field>
          {f.audience === "team" ? <Field label="Team member name (blank = alert everyone)"><input className={inputCls} value={f.assignee} onChange={(e) => set("assignee", e.target.value)} /></Field>
            : (<><Field label="Client phone"><input className={inputCls} value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field><Field label="Client email"><input className={inputCls} value={f.email} onChange={(e) => set("email", e.target.value)} /></Field></>)}
          <Btn tone="gold" onClick={add} disabled={!f.title || !f.at}>Set reminder</Btn>{msg && <p className="text-[10px] text-slate-400">{msg}</p>}
        </div>
      </Card>
    </div>
  );
}
