"use client";
// WhatsApp Broadcast — send one message to many people: text / image-PDF / approved template, audience from
// CRM leads (filters or hand-picked) + pasted numbers, merge tags, send window, schedule, live per-recipient report.
import { useEffect, useRef, useState } from "react";
import { listBroadcasts, getBroadcastRecipients, previewAudience, getAudienceOptions, createWaBroadcast, controlBroadcast, runBroadcastNow, sendBroadcastTest, type BroadcastSummary, type QrLive } from "@/lib/actions/waBroadcast";
import { listTemplates } from "@/lib/actions/comms";
import type { AudienceSpec } from "@/lib/whatsapp/broadcast";
import { istHour, inSendWindow, etaMinutes, formatEta, spin, spinVariants } from "@/lib/whatsapp/plan";
import { Btn, Card, Badge, Field, inputCls, fmt, token, useLoad, s, type Row } from "./ui";

const STATUS_TONE: Record<string, "slate" | "green" | "amber" | "red" | "gold" | "blue"> = { draft: "slate", scheduled: "blue", running: "gold", paused: "amber", completed: "green", cancelled: "red" };
const TAGS = ["{{name}}", "{{firstName}}", "{{company}}"];
const SPINS = ["{Hi|Hello|Namaste}", "{Thanks|Thank you}"];
const LEAD_STATUSES = ["hot", "warm", "cold"];
const paramCount = (body: string) => { const n = [...body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((m) => Number(m[1])); return n.length ? Math.max(...n) : 0; };
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

interface Draft {
  name: string; mode: "text" | "media" | "template"; body: string; mediaUrl: string; templateId: string; params: string[];
  optOut: boolean; useWindow: boolean; wStart: number; wEnd: number; schedule: string;
  tab: "leads" | "paste"; useFilters: boolean; statuses: string[]; stages: string[]; tags: string[]; owner: string; minScore: number; leadIds: number[]; pasted: string;
}
const blank: Draft = { name: "", mode: "text", body: "", mediaUrl: "", templateId: "", params: [], optOut: true, useWindow: true, wStart: 9, wEnd: 20, schedule: "", tab: "leads", useFilters: true, statuses: [], stages: [], tags: [], owner: "", minScore: 0, leadIds: [], pasted: "" };

const toggle = (xs: string[], x: string) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

export default function BroadcastTab() {
  const [data, reload] = useLoad(() => listBroadcasts(token()), { items: [] as BroadcastSummary[], sentLast24h: 0, dailyCap: 0, provider: "", qr: null as QrLive | null }, 5000);
  const [tpls] = useLoad(() => listTemplates("whatsapp", token()), [] as Row[]);
  const [opts] = useLoad(() => getAudienceOptions(token()), { stages: [] as string[], owners: [] as string[], tags: [] as string[], leads: [] as { id: number; name: string; phone: string }[] });
  const [composing, setComposing] = useState(false);
  const [d, setD] = useState<Draft>(blank);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewAudience>> | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null), [busy, setBusy] = useState(""), [testPhone, setTestPhone] = useState("");
  const [open, setOpen] = useState<string | null>(null), [filter, setFilter] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const approved = tpls.filter((t) => t.approved && t.meta_name);
  const tpl = approved.find((t) => s(t.id) === d.templateId);
  const n = tpl ? paramCount(s(tpl.body)) : 0;

  const spec: AudienceSpec = {
    leadIds: d.leadIds, pasted: d.pasted, useFilters: d.tab === "leads" && d.useFilters,
    filters: { statuses: d.statuses, stages: d.stages, tags: d.tags, owner: d.owner || undefined, minScore: d.minScore || undefined },
  };
  const specKey = JSON.stringify(spec);
  const specRef = useRef(spec);
  useEffect(() => { specRef.current = spec; });

  // Live audience count (debounced) while composing.
  useEffect(() => {
    if (!composing) return;
    const t = setTimeout(() => { previewAudience(specRef.current, token()).then(setPreview).catch(() => {}); }, 450);
    return () => clearTimeout(t);
  }, [composing, specKey]);

  // While any broadcast is running and this tab is open, keep it moving (the cron does it when nobody is watching).
  const running = data.items.find((b) => b.status === "running" || (b.status === "scheduled" && b.scheduled_at && new Date(b.scheduled_at) <= new Date()));
  const inflight = useRef(false);
  useEffect(() => {
    if (!running || inflight.current) return;
    inflight.current = true;
    runBroadcastNow(running.id, token()).catch(() => null)
      .then(async (rep) => { await new Promise((r) => setTimeout(r, rep && rep.sent + rep.failed + rep.skipped > 0 ? 500 : 15_000)); }) // idle (window closed / cap / paused) → back off
      .finally(() => { inflight.current = false; reload(); });
  }, [running, data, reload]);

  // Recipient report for the opened broadcast.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const load = () => getBroadcastRecipients(open, filter || undefined, token()).then((r) => alive && setRows(r)).catch(() => {});
    load();
    const t = setInterval(load, 6000);
    return () => { alive = false; clearInterval(t); };
  }, [open, filter]);

  const input = () => ({
    name: d.name, mode: d.mode, body: d.mode === "template" ? s(tpl?.body) : d.body, mediaUrl: d.mediaUrl,
    templateName: s(tpl?.meta_name), templateLang: s(tpl?.language) || "en", templateParams: d.params.slice(0, n),
    optOutFooter: d.optOut, windowStart: d.useWindow ? d.wStart : null, windowEnd: d.useWindow ? d.wEnd : null,
    scheduledAtIso: d.schedule ? new Date(d.schedule).toISOString() : null, audience: spec,
  });
  const isQr = data.provider === "qr";
  const modes = (isQr ? ["text", "media"] : ["text", "media", "template"]) as ("text" | "media" | "template")[];
  const nowH = istHour();
  const outsideWindow = d.useWindow && !d.schedule && !inSendWindow(d.wStart, d.wEnd);
  const sendable = preview?.sendable ?? 0;
  const etaMin = isQr ? etaMinutes(sendable) : 0; // QR service paces 4–9 s per message + typing delay
  const qr = data.qr;
  const qrDown = isQr && qr != null && qr.state !== "open";
  const variants = spinVariants(d.body);
  const missing = [!d.name.trim() && "broadcast name", !(d.mode === "template" ? Boolean(tpl) : d.body.trim() || d.mediaUrl.trim()) && "message", sendable === 0 && "at least one sendable recipient"].filter(Boolean) as string[];
  const valid = d.name.trim() && (d.mode === "template" ? Boolean(tpl) : d.body.trim() || d.mediaUrl.trim()) && (preview?.sendable ?? 0) > 0;

  const create = async (start: boolean) => {
    if (start && !confirm(`${d.schedule ? "Schedule" : "Send"} “${d.name.trim()}” to ${sendable} contact${sendable === 1 ? "" : "s"} via ${data.provider === "qr" ? "your own WhatsApp number (QR)" : data.provider === "cloud" ? "Meta Cloud API" : "Twilio"}?${etaMin ? `\nTakes about ${formatEta(etaMin)}.` : ""}${outsideWindow ? `\nIt is outside the send window — it will start at ${d.wStart}:00 IST.` : ""}\n\nSend a test to yourself first if you haven't.`)) return;
    setBusy("create"); setMsg(null);
    try {
      const r = await createWaBroadcast(input(), start, token());
      if (!r.ok) return setMsg({ ok: false, text: r.error ?? "Could not create." });
      setMsg({ ok: true, text: `${start ? (r.status === "scheduled" ? "Scheduled" : "Started") : "Saved as draft"} — ${r.total} recipients${r.skipped ? ` (${r.skipped} skipped: opted out)` : ""}.` });
      setComposing(false); setD(blank); setPreview(null); reload();
    } finally { setBusy(""); }
  };
  const act = async (id: string, a: Parameters<typeof controlBroadcast>[1]) => {
    const r = await controlBroadcast(id, a, token());
    setMsg({ ok: r.ok, text: r.ok ? (a === "retry" ? `${r.requeued} failed messages re-queued.` : `Done: ${a}`) : (r.error ?? "Failed") });
    if (a === "delete" && open === id) setOpen(null);
    reload();
  };
  const sendTest = async () => {
    setBusy("test");
    try { const r = await sendBroadcastTest({ ...input() }, testPhone, token()); setMsg({ ok: r.ok, text: r.detail }); } finally { setBusy(""); }
  };

  const sample = { name: "Asha Sharma", firstName: "Asha", company: "Acme Pvt Ltd" };
  const fill = (t: string) => spin(t, "preview").replace(/\{\{\s*(name|firstName|company)\s*\}\}/g, (_, k: keyof typeof sample) => sample[k]);
  const previewText = d.mode === "template"
    ? s(tpl?.body).replace(/\{\{\s*(\d+)\s*\}\}/g, (_, i: string) => fill(d.params[Number(i) - 1] ?? `{{${i}}}`))
    : fill(d.body) + (d.mode === "text" && d.optOut ? "\n\nReply STOP to opt out." : "");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">{data.provider && <Badge tone={isQr ? "amber" : data.provider === "cloud" ? "green" : "blue"}>Via {data.provider === "qr" ? "WhatsApp QR (own number)" : data.provider === "cloud" ? "Meta Cloud API" : "Twilio"}</Badge>}Sent in the last 24h: <b className="text-white">{data.sentLast24h}</b>{data.dailyCap ? <> / {data.dailyCap} cap</> : null}</div>
        <div className="flex items-center gap-2">{msg && <span className={`text-[11px] ${msg.ok ? "text-emerald-400" : "text-rose-400"}`}>{msg.text}</span>}<Btn tone="gold" onClick={() => { setComposing(!composing); setMsg(null); }}>{composing ? "Close" : "+ New broadcast"}</Btn></div>
      </div>

      {qrDown && <p className="text-[11px] text-rose-300 border border-rose-500/40 bg-rose-500/10 rounded-lg p-2">🔴 WhatsApp number is <b>{qr?.state === "unreachable" ? "unreachable (QR service is not running)" : qr?.state}</b>. Sending is blocked and running broadcasts will pause. Open WhatsApp Setup → scan the QR / start the service.</p>}
      {isQr && qr?.state === "open" && qr.warmup && <p className="text-[11px] text-sky-300 border border-sky-500/30 bg-sky-500/10 rounded-lg p-2">🌱 Number warm-up: linked {qr.linkedDays ?? 0} day(s) ago — limited to <b>{qr.dailyCap}/day</b> for now (rises automatically up to {qr.maxCap}). This protects the number from bans.</p>}

      {composing && (
        <div className="grid lg:grid-cols-2 gap-3">
          <div className="space-y-3">
            <Card title="1 · Message">
              <div className="space-y-2">
                <Field label="Broadcast name (internal)"><input className={inputCls} value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="Diwali offer – hot leads" /></Field>
                <div className="flex gap-1">{modes.map((m) => <Btn key={m} tone={d.mode === m ? "gold" : "ghost"} onClick={() => set("mode", m)}>{m === "text" ? "Text" : m === "media" ? "Image / PDF" : "Approved template"}</Btn>)}</div>
                {d.mode === "template" ? (
                  <>
                    <Field label="Template (approved on Meta — works even outside the 24h window)">
                      <select className={inputCls} value={d.templateId} onChange={(e) => { set("templateId", e.target.value); set("params", []); }}>
                        <option value="">Select…</option>{approved.map((t) => <option key={s(t.id)} value={s(t.id)}>{s(t.name)} ({s(t.language)})</option>)}
                      </select>
                    </Field>
                    {!approved.length && <p className="text-[10px] text-amber-400">No approved templates yet — add them in Templates, or WhatsApp Setup → “Sync templates from Meta”.</p>}
                    {tpl && <p className="text-[10px] text-slate-500 whitespace-pre-wrap border border-white/[0.06] rounded-lg p-2">{s(tpl.body)}</p>}
                    {Array.from({ length: n }, (_, i) => <Field key={i} label={`Value for {{${i + 1}}} (you can use {{name}}, {{firstName}}, {{company}})`}><input className={inputCls} value={d.params[i] ?? ""} onChange={(e) => { const p = [...d.params]; p[i] = e.target.value; set("params", p); }} /></Field>)}
                  </>
                ) : (
                  <>
                    {d.mode === "media" && <Field label="Public https:// link to image / PDF / video"><input className={inputCls} value={d.mediaUrl} onChange={(e) => set("mediaUrl", e.target.value)} placeholder="https://…/brochure.pdf" /></Field>}
                    <Field label={d.mode === "media" ? "Caption" : "Message"}>
                      <textarea rows={5} className={inputCls} value={d.body} onChange={(e) => set("body", e.target.value)} placeholder="Hi {{firstName}}, …" />
                    </Field>
                    <div className="flex gap-1 flex-wrap items-center"><span className="text-[10px] text-slate-500">Insert:</span>{TAGS.map((t) => <Btn key={t} type="button" onClick={() => set("body", `${d.body}${t}`)}>{t}</Btn>)}<span className="text-[10px] text-slate-500 ml-2">Vary wording:</span>{SPINS.map((t) => <Btn key={t} type="button" onClick={() => set("body", `${d.body}${t}`)}>{t}</Btn>)}</div>
                    <p className="text-[10px] text-slate-500">{variants > 1 ? <>Spintax active — {variants} different versions will go out (each person gets one). Identical text to hundreds of people is a ban signal.</> : <>Tip: write <code>{"{Hi|Hello|Namaste}"}</code> — each person gets one of the options, so messages aren’t identical.</>}</p>
                    {d.mode === "text" && <label className="flex items-center gap-1.5 text-[11px] text-slate-300"><input type="checkbox" checked={d.optOut} onChange={(e) => set("optOut", e.target.checked)} /> Add “Reply STOP to opt out.” (recommended — keeps the number healthy)</label>}
                    <div className="text-[10px] text-slate-500 text-right">{d.body.length} characters</div>
                    {isQr && <p className="text-[11px] text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-lg p-2">⚠ Own-number (QR) mode is unofficial — bulk or unsolicited messages can get this number banned. Messages go out one by one with a 4–9 s gap and a daily cap. Templates are not used in this mode.</p>}
                    {data.provider === "cloud"
                      ? <p className="text-[11px] text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-lg p-2">⚠ Meta Cloud API: free text and media are delivered <b>only to people who messaged you in the last 24 hours</b>. Everyone else fails. For cold contacts switch to <b>Approved template</b>. (If 5 in a row fail for this reason the broadcast pauses itself.)</p>
                      : isQr ? null : <p className="text-[10px] text-slate-500">Tip: on the Cloud API, free text only reaches people who messaged you in the last 24h — use an approved template for cold contacts.</p>}
                  </>
                )}
              </div>
            </Card>

            <Card title="2 · Audience" right={preview && <Badge tone={preview.sendable ? "green" : "red"}>{preview.sendable} will receive</Badge>}>
              <div className="flex gap-1 mb-2"><Btn tone={d.tab === "leads" ? "gold" : "ghost"} onClick={() => set("tab", "leads")}>CRM leads</Btn><Btn tone={d.tab === "paste" ? "gold" : "ghost"} onClick={() => set("tab", "paste")}>Paste numbers</Btn></div>
              {d.tab === "leads" ? (
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-300"><input type="checkbox" checked={d.useFilters} onChange={(e) => set("useFilters", e.target.checked)} /> Use filters (untick to send only to hand-picked leads)</label>
                  {d.useFilters && (
                    <>
                      <div className="flex gap-1 flex-wrap items-center"><span className="text-[10px] text-slate-500 w-14">Status</span>{LEAD_STATUSES.map((x) => <Btn key={x} tone={d.statuses.includes(x) ? "gold" : "ghost"} onClick={() => set("statuses", toggle(d.statuses, x))}>{x}</Btn>)}</div>
                      {opts.stages.length > 0 && <div className="flex gap-1 flex-wrap items-center"><span className="text-[10px] text-slate-500 w-14">Stage</span>{opts.stages.map((x) => <Btn key={x} tone={d.stages.includes(x) ? "gold" : "ghost"} onClick={() => set("stages", toggle(d.stages, x))}>{x}</Btn>)}</div>}
                      {opts.tags.length > 0 && <div className="flex gap-1 flex-wrap items-center"><span className="text-[10px] text-slate-500 w-14">Tags</span>{opts.tags.slice(0, 30).map((x) => <Btn key={x} tone={d.tags.includes(x) ? "gold" : "ghost"} onClick={() => set("tags", toggle(d.tags, x))}>{x}</Btn>)}</div>}
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Owner"><select className={inputCls} value={d.owner} onChange={(e) => set("owner", e.target.value)}><option value="">Anyone</option>{opts.owners.map((o) => <option key={o}>{o}</option>)}</select></Field>
                        <Field label="Min. score"><input type="number" min={0} max={100} className={inputCls} value={d.minScore} onChange={(e) => set("minScore", Number(e.target.value))} /></Field>
                      </div>
                      <p className="text-[10px] text-slate-500">No filter chosen = every lead that has a phone number.</p>
                    </>
                  )}
                  <details className="text-[11px]"><summary className="cursor-pointer text-slate-400">Hand-pick leads ({d.leadIds.length} selected)</summary>
                    <div className="max-h-40 overflow-y-auto mt-1 space-y-0.5">{opts.leads.map((l) => <label key={l.id} className="flex items-center gap-1.5 text-slate-300"><input type="checkbox" checked={d.leadIds.includes(l.id)} onChange={() => set("leadIds", d.leadIds.includes(l.id) ? d.leadIds.filter((x) => x !== l.id) : [...d.leadIds, l.id])} />{l.name} <span className="text-slate-500">{l.phone}</span></label>)}</div>
                  </details>
                </div>
              ) : (
                <Field label="One contact per line — “Name, +91 98123 45678” or just the number">
                  <textarea rows={6} className={inputCls} value={d.pasted} onChange={(e) => set("pasted", e.target.value)} placeholder={"Asha, 9812345678\n+971 50 123 4567"} />
                </Field>
              )}
              {preview && (
                <div className="mt-2 text-[10px] text-slate-400 space-y-0.5 border-t border-white/[0.06] pt-2">
                  <div>{preview.total} unique contacts · <span className="text-emerald-400">{preview.sendable} sendable</span>{preview.dnc > 0 && <> · <span className="text-amber-400">{preview.dnc} opted out (skipped)</span></>}{preview.duplicates > 0 && <> · {preview.duplicates} duplicates removed</>}</div>
                  {preview.invalid.length > 0 && <div className="text-rose-400">{preview.invalid.length} unusable: {preview.invalid.slice(0, 3).join("; ")}{preview.invalid.length > 3 ? "…" : ""}</div>}
                  {preview.sample.length > 0 && <div>e.g. {preview.sample.map((x) => x.name || x.phone).join(", ")}</div>}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-3">
            <Card title="Preview">
              <div className="rounded-xl bg-[#0b141a] p-3"><div className="max-w-[85%] ml-auto rounded-lg rounded-tr-none bg-[#005c4b] px-3 py-2 text-[11px] text-white whitespace-pre-wrap">{d.mode === "media" && d.mediaUrl && <div className="mb-1 text-[10px] opacity-70 break-all">📎 {d.mediaUrl}</div>}{previewText || <span className="opacity-50">Your message appears here…</span>}</div></div>
              <p className="text-[10px] text-slate-500 mt-1">Shown with sample data ({sample.name}).</p>
            </Card>
            <Card title="3 · Delivery">
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-300"><input type="checkbox" checked={d.useWindow} onChange={(e) => set("useWindow", e.target.checked)} /> Only send between
                  <input type="number" min={0} max={23} className={`${inputCls} !w-14`} value={d.wStart} onChange={(e) => set("wStart", Number(e.target.value))} /> and
                  <input type="number" min={0} max={23} className={`${inputCls} !w-14`} value={d.wEnd} onChange={(e) => set("wEnd", Number(e.target.value))} /> (IST hours) — unsent messages wait for the next window</label>
                {outsideWindow && <p className="text-[11px] text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-lg p-2">⏰ It is {nowH}:00 IST now — outside {d.wStart}:00–{d.wEnd}:00. “Send now” will queue and start at {d.wStart}:00 IST. Untick the window to send immediately.</p>}
                {etaMin > 0 && <p className="text-[10px] text-slate-400">Estimated time: ~{formatEta(etaMin)} for {sendable} messages (paced to protect your number).</p>}
                <Field label="Schedule (optional, your device’s local time — leave empty to start now)"><input type="datetime-local" className={inputCls} value={d.schedule} onChange={(e) => set("schedule", e.target.value)} /></Field>
                <div className="flex gap-1.5 items-end">
                  <div className="flex-1"><Field label="Send a test to my number first"><input className={inputCls} value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+91 …" /></Field></div>
                  <Btn disabled={busy === "test" || !testPhone.trim() || (d.mode === "template" ? !tpl : !d.body.trim() && !d.mediaUrl.trim())} onClick={sendTest}>{busy === "test" ? "…" : "Send test"}</Btn>
                </div>
                <div className="flex gap-1.5 pt-1"><Btn tone="gold" disabled={!valid || qrDown || busy === "create"} onClick={() => create(true)}>{d.schedule ? "Schedule broadcast" : "Send now"}</Btn><Btn disabled={!valid || busy === "create"} onClick={() => create(false)}>Save as draft</Btn></div>
                {!valid && <p className="text-[10px] text-rose-400">Still needed: {missing.join(", ")}.</p>}
              </div>
            </Card>
          </div>
        </div>
      )}

      <Card title="Broadcasts">
        {data.items.length === 0 && <p className="text-[11px] text-slate-500">No broadcasts yet. Click “+ New broadcast”.</p>}
        <div className="space-y-2">
          {data.items.map((b) => {
            const c = b.counts, done = c.sent + c.delivered + c.read + c.failed + c.skipped, tot = b.total || 1;
            return (
              <div key={b.id} className="rounded-lg border border-white/[0.06] p-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-white">{b.name}</span><Badge tone={STATUS_TONE[b.status] ?? "slate"}>{b.status}</Badge><Badge>{b.mode}</Badge>
                  <span className="text-[10px] text-slate-500">{fmt(b.scheduled_at ?? b.created_at)} · {b.total} recipients</span>
                  <div className="ml-auto flex gap-1 flex-wrap">
                    {b.status === "draft" && <Btn tone="gold" onClick={() => act(b.id, "start")}>Start</Btn>}
                    {(b.status === "running" || b.status === "scheduled") && <Btn onClick={() => act(b.id, "pause")}>Pause</Btn>}
                    {b.status === "paused" && <Btn tone="gold" onClick={() => act(b.id, "resume")}>Resume</Btn>}
                    {c.failed > 0 && b.status !== "cancelled" && <Btn onClick={() => act(b.id, "retry")}>Retry {c.failed} failed</Btn>}
                    {["draft", "scheduled", "running", "paused"].includes(b.status) && <Btn tone="danger" onClick={() => act(b.id, "cancel")}>Cancel</Btn>}
                    <Btn onClick={() => { setOpen(open === b.id ? null : b.id); setFilter(""); setRows([]); }}>{open === b.id ? "Hide report" : "Report"}</Btn>
                    {b.status !== "running" && <Btn tone="danger" onClick={() => { if (confirm(`Delete “${b.name}” and its report?`)) act(b.id, "delete"); }}>Delete</Btn>}
                  </div>
                </div>
                <div className="h-1.5 rounded bg-white/[0.06] mt-2 overflow-hidden"><div className="h-full bg-[#c9a84c]" style={{ width: `${pct(done, tot)}%` }} /></div>
                <div className="flex gap-3 flex-wrap text-[10px] text-slate-400 mt-1.5">
                  <span>Sent <b className="text-white">{c.sent + c.delivered + c.read}</b></span><span>Delivered <b className="text-white">{c.delivered + c.read}</b></span><span>Read <b className="text-white">{c.read}</b> ({pct(c.read, c.sent + c.delivered + c.read)}%)</span>
                  <span>Replied <b className="text-emerald-400">{c.replied}</b></span><span>Failed <b className="text-rose-400">{c.failed}</b></span><span>Skipped <b className="text-amber-400">{c.skipped}</b></span><span>Waiting <b className="text-white">{c.pending}</b></span>
                </div>
                {b.note && <p className="text-[10px] text-amber-400 mt-1">{b.note}</p>}
                {open === b.id && (
                  <div className="mt-2 border-t border-white/[0.06] pt-2">
                    <div className="flex gap-1 mb-1.5 flex-wrap">{["", "pending", "sent", "delivered", "read", "replied", "failed", "skipped"].map((f) => <Btn key={f || "all"} tone={filter === f ? "gold" : "ghost"} onClick={() => setFilter(f)}>{f || "all"}</Btn>)}</div>
                    <div className="max-h-64 overflow-y-auto text-[10px]">
                      {rows.length === 0 ? <p className="text-slate-500">No rows.</p> : rows.map((r) => (
                        <div key={s(r.id)} className="flex items-center gap-2 py-1 border-b border-white/[0.04]">
                          <span className="w-32 truncate text-slate-200">{s(r.name) || "—"}</span><span className="w-28 text-slate-400">{s(r.phone)}</span>
                          <Badge tone={s(r.status) === "failed" ? "red" : s(r.status) === "read" ? "green" : s(r.status) === "skipped" ? "amber" : s(r.status) === "pending" ? "slate" : "blue"}>{s(r.status)}</Badge>
                          {r.replied_at ? <Badge tone="green">replied</Badge> : null}
                          <span className="text-slate-500 truncate flex-1">{s(r.error) || fmt(r.read_at ?? r.delivered_at ?? r.sent_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
