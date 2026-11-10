"use client";
import { useState } from "react";
import { listTemplates, saveTemplate, deleteTemplate, type TemplateInput } from "@/lib/actions/comms";
import { submitMetaTemplate, syncMetaTemplates, type MetaTemplateInput } from "@/lib/actions/waSetup";
import { Btn, Card, Badge, Field, inputCls, token, useLoad, s, type Row } from "./ui";

const blank: TemplateInput = { kind: "whatsapp", name: "", subject: "", body: "", meta_name: "", language: "en", approved: false };
const metaBlank: MetaTemplateInput = { name: "", category: "UTILITY", language: "en", body: "", examples: [] };
const KIND = { whatsapp: "WhatsApp templates", email: "Email templates", quick_reply: "Quick replies" } as const;

export default function TemplatesTab() {
  const [rows, reload] = useLoad(() => listTemplates(undefined, token()), [] as Row[]);
  const [form, setForm] = useState<TemplateInput>(blank);
  const [mt, setMt] = useState<MetaTemplateInput>(metaBlank), [mtMsg, setMtMsg] = useState<{ ok: boolean; text: string } | null>(null);
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
      <Card title="Create a WhatsApp template on Meta (needs Cloud API)" className="lg:col-start-2">
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500">Submits the template to Meta for approval (usually minutes–24h). Needed to message people outside the 24h window. Then press “Check approval status”.</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2"><Field label="Name (lowercase_with_underscores)"><input className={inputCls} value={mt.name} onChange={(e) => setMt({ ...mt, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} placeholder="diwali_offer" /></Field></div>
            <Field label="Language"><input className={inputCls} value={mt.language} onChange={(e) => setMt({ ...mt, language: e.target.value })} /></Field>
          </div>
          <Field label="Category"><select className={inputCls} value={mt.category} onChange={(e) => setMt({ ...mt, category: e.target.value as MetaTemplateInput["category"] })}><option value="UTILITY">Utility (order / appointment / account updates)</option><option value="MARKETING">Marketing (offers, promotions — costs more)</option></select></Field>
          <Field label="Body — use {{1}}, {{2}} for variables (not at the very start/end)"><textarea rows={4} className={inputCls} value={mt.body} onChange={(e) => setMt({ ...mt, body: e.target.value })} placeholder="Hi {{1}}, your appointment is confirmed for {{2}}. Reply here if you need to change it." /></Field>
          <Field label="Example value for each variable — comma separated, in order"><input className={inputCls} value={mt.examples.join(", ")} onChange={(e) => setMt({ ...mt, examples: e.target.value.split(",") })} placeholder="Asha, Monday 4 PM" /></Field>
          <div className="flex gap-2 items-center">
            <Btn tone="gold" disabled={!mt.name.trim() || !mt.body.trim()} onClick={async () => { const r = await submitMetaTemplate({ ...mt, examples: mt.examples.map((x) => x.trim()) }, token()); setMtMsg({ ok: r.ok, text: r.ok ? "Submitted to Meta — status: pending approval." : (r.error ?? "Failed") }); if (r.ok) { setMt(metaBlank); reload(); } }}>Submit to Meta</Btn>
            <Btn onClick={async () => { const r = await syncMetaTemplates(token()); setMtMsg({ ok: r.ok, text: r.ok ? `Checked: ${r.approved} approved (${r.added} new, ${r.updated} updated).` : (r.error ?? "Sync failed") }); reload(); }}>Check approval status</Btn>
            {mtMsg && <span className={`text-[10px] ${mtMsg.ok ? "text-emerald-400" : "text-rose-400"}`}>{mtMsg.text}</span>}
          </div>
        </div>
      </Card>
    </div>
  );
}
