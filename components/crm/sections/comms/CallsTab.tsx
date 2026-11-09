"use client";
import { useState } from "react";
import { Phone, Play } from "lucide-react";
import { getRecentCalls, searchLeadsForCall, placeCall, submitCallOutcome, getCallRecording } from "@/lib/actions/comms";
import { CALL_OUTCOMES, type CallOutcome } from "@/lib/telephony/outcomeTypes";
import { Btn, Card, Badge, Field, inputCls, fmt, token, useLoad, s, type Row } from "./ui";

const LABEL: Record<string, string> = { interested: "Interested", callback: "Call back later", not_picked: "Not picked", busy: "Busy", voicemail: "Voicemail", wrong_number: "Wrong number", not_interested: "Not interested", do_not_call: "Do not call" };

export default function CallsTab() {
  const [calls, reload] = useLoad(() => getRecentCalls(token()), [] as Row[], 20_000);
  const [q, setQ] = useState(""), [results, setResults] = useState<Row[]>([]);
  const [lead, setLead] = useState<Row | null>(null);
  const [agentPhone, setAgentPhone] = useState(""), [agent, setAgent] = useState("");
  const [callLogId, setCallLogId] = useState<string | undefined>();
  const [outcome, setOutcome] = useState<CallOutcome>("interested"), [notes, setNotes] = useState(""), [cb, setCb] = useState("");
  const [msg, setMsg] = useState(""), [audio, setAudio] = useState<{ id: string; url: string } | null>(null);

  const search = async (v: string) => { setQ(v); setResults(v.length > 1 ? await searchLeadsForCall(v, token()) : []); };
  const dial = async () => {
    if (!lead) return;
    const r = await placeCall(Number(lead.id), agentPhone, agent, token());
    setCallLogId(r.callLogId); setMsg(r.detail ?? (r.ok ? "Calling…" : "Failed"));
    if (r.mode === "manual" && r.tel) window.location.href = r.tel;
    reload();
  };
  const save = async () => {
    if (!lead) return;
    const r = await submitCallOutcome({ leadId: Number(lead.id), outcome, notes, callbackAtIso: cb ? new Date(cb).toISOString() : undefined, callLogId, agent }, token());
    setMsg(r.action); if (r.ok) { setNotes(""); setCb(""); setCallLogId(undefined); reload(); }
  };
  const play = async (id: string) => { const r = await getCallRecording(id, token()); if (r.ok && r.dataUrl) setAudio({ id, url: r.dataUrl }); else setMsg(r.detail ?? "No recording"); };

  return (
    <div className="grid lg:grid-cols-2 gap-3">
      <Card title="Call desk">
        <div className="space-y-2">
          <Field label="Find lead"><input className={inputCls} placeholder="Search name or company…" value={q} onChange={(e) => search(e.target.value)} /></Field>
          {results.map((r) => <button key={s(r.id)} onClick={() => { setLead(r); setResults([]); setQ(s(r.name)); }} className="block w-full text-left px-2 py-1 rounded-md bg-white/[0.04] text-[11px] text-slate-200 hover:bg-white/[0.08]">{s(r.name)} · {s(r.company)} · {s(r.phone)}</button>)}
          {lead && <p className="text-[11px] text-[#c9a84c]">Selected: {s(lead.name)} ({s(lead.phone) || "no phone"})</p>}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Your name"><input className={inputCls} value={agent} onChange={(e) => setAgent(e.target.value)} /></Field>
            <Field label="Your phone (Twilio rings you first)"><input className={inputCls} placeholder="+91…" value={agentPhone} onChange={(e) => setAgentPhone(e.target.value)} /></Field>
          </div>
          <Btn tone="gold" onClick={dial} disabled={!lead}><Phone size={11} className="inline mr-1" />Call now</Btn>
          <hr className="border-white/[0.06]" />
          <Field label="Call outcome">
            <select className={inputCls} value={outcome} onChange={(e) => setOutcome(e.target.value as CallOutcome)}>{CALL_OUTCOMES.map((o) => <option key={o} value={o}>{LABEL[o]}</option>)}</select>
          </Field>
          {outcome === "callback" && <Field label="Call back at"><input type="datetime-local" className={inputCls} value={cb} onChange={(e) => setCb(e.target.value)} /></Field>}
          <Field label="Notes"><textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <Btn tone="gold" onClick={save} disabled={!lead || (outcome === "callback" && !cb)}>Save outcome &amp; run next step</Btn>
          {msg && <p className="text-[10px] text-slate-400">{msg}</p>}
        </div>
      </Card>
      <Card title="Recent calls">
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {calls.length === 0 && <p className="text-[11px] text-slate-500">No calls logged yet.</p>}
          {calls.map((c) => {
            const l = c.leads as { name?: string; company?: string } | null;
            return (
              <div key={s(c.id)} className="px-2 py-1.5 rounded-lg bg-white/[0.03] text-[11px]">
                <div className="flex items-center gap-2"><span className="font-semibold text-white">{l?.name ?? s(c.from_number) ?? "—"}</span>
                  <Badge tone="slate">{s(c.direction)}</Badge>{s(c.outcome) && <Badge tone="gold">{LABEL[s(c.outcome)] ?? s(c.outcome)}</Badge>}
                  <span className="ml-auto text-[9px] text-slate-500">{fmt(c.created_at)}</span></div>
                <div className="text-[10px] text-slate-500">{s(c.status)}{c.duration_seconds != null && ` · ${s(c.duration_seconds)}s`}{s(c.agent) && ` · ${s(c.agent)}`}{s(c.notes) && ` · ${s(c.notes)}`}{s(c.callback_at) && ` · callback ${fmt(c.callback_at)}`}</div>
                {s(c.recording_url) && (audio && audio.id === s(c.id) ? <audio controls autoPlay src={audio.url} className="h-7 mt-1 w-full" /> : <button onClick={() => play(s(c.id))} className="mt-1 text-[10px] text-[#c9a84c] flex items-center gap-1"><Play size={10} />Play recording</button>)}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
