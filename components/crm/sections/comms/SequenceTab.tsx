"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { loadSequence, saveSequence, resetSequence } from "@/lib/actions/comms";
import type { SequenceStep, FollowUpChannel } from "@/lib/followup/sequence";
import { Btn, Card, inputCls, token, useLoad } from "./ui";

export default function SequenceTab() {
  const [seq, reload] = useLoad(() => loadSequence(token()), null as Awaited<ReturnType<typeof loadSequence>>);
  const [draft, setDraft] = useState<SequenceStep[] | null>(null);
  const [msg, setMsg] = useState("");
  const steps = draft ?? seq?.steps ?? [];
  const edit = (i: number, patch: Partial<SequenceStep>) => setDraft(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const save = async () => { const r = await saveSequence(steps, token()); setMsg(r.ok ? "Saved — applies to NEW leads (leads already in the drip keep their current sequence)." : `Failed: ${r.detail}`); if (r.ok) { setDraft(null); reload(); } };

  return (
    <Card title={`${seq?.name ?? "Sequence"} — ${steps.length} touches${seq?.custom ? " (customised)" : " (default)"}`}
      right={<div className="flex gap-1.5"><Btn onClick={() => setDraft([...steps, { atHours: (steps.at(-1)?.atHours ?? 0) + 24, channel: "whatsapp", body: "" }])}><Plus size={11} className="inline" /> Add step</Btn>
        {seq?.custom && <Btn tone="danger" onClick={async () => { await resetSequence(token()); setDraft(null); reload(); }}>Reset to default</Btn>}<Btn tone="gold" onClick={save}>Save</Btn></div>}>
      <p className="text-[10px] text-slate-500 mb-2">Time = hours after enrolment. Variables: {"{{firstName}} {{company}} {{brand}} {{owner}} {{bookingLink}} {{paymentLink}}"}. Wrap optional text in [[ ]] — it disappears if its link isn&apos;t set. Quiet hours (9 PM–9 AM, lead&apos;s local time) are applied automatically.</p>
      <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
        {steps.map((st, i) => (
          <div key={i} className="grid grid-cols-[64px_100px_1fr_28px] gap-1.5 items-start">
            <input className={inputCls} type="number" min={0} value={st.atHours} onChange={(e) => edit(i, { atHours: Number(e.target.value) })} title="Hours after enrolment" />
            <select className={inputCls} value={st.channel} onChange={(e) => edit(i, { channel: e.target.value as FollowUpChannel })}><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">Call task</option><option value="voicemail">Voicemail</option></select>
            <div className="space-y-1">{st.channel === "email" && <input className={inputCls} placeholder="Subject" value={st.subject ?? ""} onChange={(e) => edit(i, { subject: e.target.value })} />}
              <textarea className={inputCls} rows={2} value={st.body} onChange={(e) => edit(i, { body: e.target.value })} />
              {st.channel === "whatsapp" && <input className={inputCls} placeholder="WhatsApp template name (optional, for cold messages)" value={st.waTemplate ?? ""} onChange={(e) => edit(i, { waTemplate: e.target.value || undefined })} />}</div>
            <button onClick={() => setDraft(steps.filter((_, j) => j !== i))} className="p-1.5 text-slate-500 hover:text-rose-400" aria-label="Remove step"><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
      {msg && <p className="text-[10px] text-emerald-400 mt-2">{msg}</p>}
    </Card>
  );
}
