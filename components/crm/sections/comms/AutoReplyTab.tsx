"use client";
// Keyword auto-reply rules for inbound WhatsApp — saved in the DB and applied by the inbound pipeline
// (lib/comms/autoReply.ts) before the AI answer / off-hours reply. Includes a "what would it answer?" tester.
import { useState } from "react";
import { listAutoRules, saveAutoRule, toggleAutoRule, deleteAutoRule, testAutoRules, type AutoRuleInput } from "@/lib/actions/waRules";
import { Btn, Card, Badge, Field, inputCls, token, useLoad } from "./ui";

const blank: AutoRuleInput = { name: "", keywords: "", match: "contains", response: "", when_open: "always", priority: 100, active: true };
const WHEN = { always: "Always", in_hours: "Only in business hours", off_hours: "Only outside business hours" } as const;

export default function AutoReplyTab() {
  const [rules, reload] = useLoad(() => listAutoRules(token()), [] as Awaited<ReturnType<typeof listAutoRules>>);
  const [f, setF] = useState<AutoRuleInput>(blank);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [probe, setProbe] = useState(""), [result, setResult] = useState<Awaited<ReturnType<typeof testAutoRules>> | null>(null);
  const set = <K extends keyof AutoRuleInput>(k: K, v: AutoRuleInput[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = async () => {
    const r = await saveAutoRule(f, token());
    setMsg({ ok: r.ok, text: r.ok ? "Saved" : (r.error ?? "Failed") });
    if (r.ok) { setF(blank); reload(); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-3">
      <div className="space-y-3">
        <Card title={`Rules (${rules.length}) — first match by priority wins`}>
          {rules.length === 0 && <p className="text-[11px] text-slate-500">No rules yet. Add one on the right — e.g. keywords “price, rate, kitne ka” → your pricing message.</p>}
          <div className="space-y-1.5">
            {rules.map((r) => (
              <div key={r.id} className="rounded-lg border border-white/[0.06] p-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-white">{r.name}</span><Badge tone={r.active ? "green" : "slate"}>{r.active ? "on" : "off"}</Badge><Badge>{r.match}</Badge>
                  {r.when_open !== "always" && <Badge tone="blue">{r.when_open === "off_hours" ? "off-hours" : "in-hours"}</Badge>}
                  <span className="text-[9px] text-slate-500">priority {r.priority} · {r.hits} replies sent</span>
                  <div className="ml-auto flex gap-1">
                    <Btn onClick={async () => { await toggleAutoRule(r.id, !r.active, token()); reload(); }}>{r.active ? "Turn off" : "Turn on"}</Btn>
                    <Btn onClick={() => setF({ id: r.id, name: r.name, keywords: r.keywords, match: r.match, response: r.response, when_open: r.when_open, priority: r.priority, active: r.active })}>Edit</Btn>
                    <Btn tone="danger" onClick={async () => { if (confirm(`Delete rule “${r.name}”?`)) { await deleteAutoRule(r.id, token()); reload(); } }}>Delete</Btn>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1"><b>If</b> {r.keywords.split(/[\n,|]/).map((k) => k.trim()).filter(Boolean).join(" · ")}</p>
                <p className="text-[10px] text-slate-300 whitespace-pre-wrap"><b className="text-slate-400">Reply</b> {r.response}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Test — what would the bot answer?">
          <div className="flex gap-1.5"><input className={inputCls} value={probe} onChange={(e) => setProbe(e.target.value)} placeholder="Type a customer message…" onKeyDown={async (e) => { if (e.key === "Enter" && probe.trim()) setResult(await testAutoRules(probe, token())); }} />
            <Btn disabled={!probe.trim()} onClick={async () => setResult(await testAutoRules(probe, token()))}>Test</Btn></div>
          {result && (result.matched
            ? <div className="mt-2 text-[11px]"><Badge tone="green">matched “{result.rule}”</Badge><p className="text-slate-200 whitespace-pre-wrap mt-1">{result.reply}</p></div>
            : <p className="mt-2 text-[11px] text-slate-400">No rule matches{result.open ? "" : " (currently outside business hours)"} — the AI answer / off-hours message (Settings) would handle it.</p>)}
        </Card>
      </div>
      <Card title={f.id ? "Edit rule" : "New rule"}>
        <div className="space-y-2">
          <Field label="Name (optional)"><input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Pricing question" /></Field>
          <Field label="Keywords — comma or new line separated (English / Hindi / Hinglish)"><textarea rows={2} className={inputCls} value={f.keywords} onChange={(e) => set("keywords", e.target.value)} placeholder="price, rate, kitne ka hai, cost" /></Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Match"><select className={inputCls} value={f.match} onChange={(e) => set("match", e.target.value as AutoRuleInput["match"])}><option value="contains">Contains word</option><option value="starts">Starts with</option><option value="exact">Exact message</option></select></Field>
            <Field label="When"><select className={inputCls} value={f.when_open} onChange={(e) => set("when_open", e.target.value as AutoRuleInput["when_open"])}>{Object.entries(WHEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Priority (1 = first)"><input type="number" min={1} className={inputCls} value={f.priority} onChange={(e) => set("priority", Number(e.target.value))} /></Field>
          </div>
          <Field label="Reply">
            <textarea rows={5} className={inputCls} value={f.response} onChange={(e) => set("response", e.target.value)} placeholder="Hi {{firstName}}! Our plans start at ₹4,999. Book a quick call: {{bookingLink}}" />
          </Field>
          <div className="flex gap-1 flex-wrap items-center"><span className="text-[10px] text-slate-500">Insert:</span>{["{{name}}", "{{firstName}}", "{{bookingLink}}", "{{paymentLink}}", "{{opens}}"].map((t) => <Btn key={t} type="button" onClick={() => set("response", `${f.response}${t}`)}>{t}</Btn>)}</div>
          <label className="flex items-center gap-1.5 text-[11px] text-slate-300"><input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} /> Active</label>
          <div className="flex items-center gap-2"><Btn tone="gold" onClick={save}>{f.id ? "Update rule" : "Add rule"}</Btn>{f.id && <Btn onClick={() => setF(blank)}>Cancel edit</Btn>}{msg && <span className={`text-[11px] ${msg.ok ? "text-emerald-400" : "text-rose-400"}`}>{msg.text}</span>}</div>
          <p className="text-[10px] text-slate-500">Rules run on every incoming WhatsApp message, before the AI answer and the off-hours message. A customer who says STOP is never auto-replied to. The same rule can answer a customer again only after 5 minutes.</p>
        </div>
      </Card>
    </div>
  );
}
