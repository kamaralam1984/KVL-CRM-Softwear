"use client";
import { useState } from "react";
import { listTemplates, saveTemplate, deleteTemplate, type TemplateInput } from "@/lib/actions/comms";
import { Btn, Card, Badge, Field, inputCls, token, useLoad, s, type Row } from "./ui";

const blank: TemplateInput = { kind: "whatsapp", name: "", subject: "", body: "", meta_name: "", language: "en", approved: false };
const KIND = { whatsapp: "WhatsApp templates", email: "Email templates", quick_reply: "Quick replies" } as const;

export default function TemplatesTab() {
  const [rows, reload] = useLoad(() => listTemplates(undefined, token()), [] as Row[]);
  const [form, setForm] = useState<TemplateInput>(blank);
  const [msg, setMsg] = useState("");
  const set = <K extends keyof TemplateInput>(k: K, v: TemplateInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => { const ok = await saveTemplate(form, token()); setMsg(ok ? "Saved" : "Save failed"); if (ok) { setForm(blank); reload(); } };

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-3">
      <div className="space-y-3">
        {(Object.keys(KIND) as (keyof typeof KIND)[]).map((k) => (
          <Card key={k} title={KIND[k]}>
            {rows.filter((r) => r.kind === k).length === 0 && <p className="text-[10px] text-slate-500">None yet.</p>}
            {rows.filter((r) => r.kind === k).map((r) => (
              <div key={s(r.id)} className="flex items-start gap-2 py-1.5 border-t border-white/[0.04] first:border-0">
                <div className="flex-1 min-w-0"><div className="text-[11px] font-semibold text-white flex gap-1.5 items-center">{s(r.name)}{k === "whatsapp" && (r.approved ? <Badge tone="green">approved</Badge> : <Badge tone="amber">not approved</Badge>)}</div>
                  <div className="text-[10px] text-slate-500 truncate">{s(r.subject) && `${s(r.subject)} — `}{s(r.body)}</div></div>
                <Btn onClick={() => setForm({ id: s(r.id), kind: k, name: s(r.name), subject: s(r.subject), body: s(r.body), meta_name: s(r.meta_name), language: s(r.language), approved: Boolean(r.approved) })}>Edit</Btn>
                <Btn tone="danger" onClick={async () => { await deleteTemplate(s(r.id), token()); reload(); }}>Delete</Btn>
              </div>
            ))}
          </Card>
        ))}
      </div>
      <Card title={form.id ? "Edit template" : "New template"}>
        <div className="space-y-2">
          <Field label="Type"><select className={inputCls} value={form.kind} onChange={(e) => set("kind", e.target.value as TemplateInput["kind"])}><option value="whatsapp">WhatsApp template</option><option value="email">Email template</option><option value="quick_reply">Quick reply</option></select></Field>
          <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          {form.kind === "email" && <Field label="Subject"><input className={inputCls} value={form.subject} onChange={(e) => set("subject", e.target.value)} /></Field>}
          <Field label="Message (variables: {{firstName}} {{company}} {{brand}} {{owner}} {{bookingLink}} {{paymentLink}}; wrap optional text in [[ ]])">
            <textarea className={inputCls} rows={5} value={form.body} onChange={(e) => set("body", e.target.value)} /></Field>
          {form.kind === "whatsapp" && (<>
            <Field label="Meta template name (exactly as approved)"><input className={inputCls} value={form.meta_name} onChange={(e) => set("meta_name", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-2"><Field label="Language"><input className={inputCls} value={form.language} onChange={(e) => set("language", e.target.value)} /></Field>
              <label className="flex items-center gap-2 text-[11px] text-slate-300 mt-5"><input type="checkbox" checked={Boolean(form.approved)} onChange={(e) => set("approved", e.target.checked)} />Approved by Meta</label></div>
            <p className="text-[10px] text-slate-500">Meta&apos;s {"{{1}} {{2}}"} are filled from the variables above in order of appearance.</p></>)}
          <div className="flex gap-2"><Btn tone="gold" onClick={save} disabled={!form.name.trim() || !form.body.trim()}>Save</Btn>{form.id && <Btn onClick={() => setForm(blank)}>Cancel</Btn>}</div>
          {msg && <p className="text-[10px] text-slate-400">{msg}</p>}
        </div>
      </Card>
    </div>
  );
}
