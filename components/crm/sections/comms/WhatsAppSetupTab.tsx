"use client";
// WhatsApp Setup — connect the BUSINESS number from inside the CRM (no .env edit / redeploy):
// Meta Cloud API, QR (linked device) or Twilio, with live connection test, QR display, webhook details,
// test message, Meta template sync and sending limits.
import { useEffect, useState } from "react";
import { getWaSetup, saveWaSetup, testWaConnection, sendWaTest, syncMetaTemplates, logoutWaQr, type WaStatus } from "@/lib/actions/waSetup";
import type { WaConfig, WaProviderChoice } from "@/lib/whatsapp/config";
import { Btn, Card, Badge, Field, inputCls, token, useLoad } from "./ui";

type Setup = Awaited<ReturnType<typeof getWaSetup>>;

const PROVIDERS: { id: Exclude<WaProviderChoice, "">; title: string; badge: string; tone: "green" | "amber" | "blue"; desc: string }[] = [
  { id: "cloud", title: "Meta Cloud API", badge: "Official · recommended", tone: "green", desc: "Your own number on the official WhatsApp Business Platform. Safe for bulk, templates, delivery & read receipts." },
  { id: "qr", title: "QR scan (linked device)", badge: "Unofficial · ban risk", tone: "amber", desc: "Scan like WhatsApp Web. Quick to start, but WhatsApp can ban numbers used for bulk. Needs the always-on /whatsapp-qr service." },
  { id: "twilio", title: "Twilio", badge: "Paid sender", tone: "blue", desc: "Twilio WhatsApp sender. Account SID / token stay in .env; set the sender number here." },
];

const rand = () => Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, "0")).join("");
const toneCls = { green: "text-emerald-400", amber: "text-amber-400", red: "text-rose-400" } as const;

export default function WhatsAppSetupTab() {
  const [loaded, reload] = useLoad<Setup>(() => getWaSetup(token()), null);
  const [edit, setEdit] = useState<WaConfig | null>(null);
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [test, setTest] = useState({ phone: "", text: "" });
  const cfg = edit ?? loaded?.config ?? null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const check = async () => { setBusy("test"); try { setStatus(await testWaConnection(token())); } finally { setBusy(""); } };
  // While waiting for a QR scan, refresh the code/state every 4 s.
  const waiting = status?.qr?.state === "qr" || status?.qr?.state === "connecting";
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => { testWaConnection(token()).then(setStatus).catch(() => {}); }, 4000);
    return () => clearInterval(t);
  }, [waiting]);

  if (!loaded || !cfg) return <p className="text-[11px] text-slate-500">{loaded === null ? "Loading… (login with an admin account to manage WhatsApp settings)" : "Loading…"}</p>;
  const up = (fn: (c: WaConfig) => void) => { const c = JSON.parse(JSON.stringify(cfg)) as WaConfig; fn(c); setEdit(c); };
  const provider: Exclude<WaProviderChoice, ""> = cfg.provider || loaded.effective;
  const run = async (key: string, fn: () => Promise<{ ok: boolean; text: string }>) => { setBusy(key); setMsg(null); try { setMsg(await fn()); } finally { setBusy(""); } };

  const save = () => run("save", async () => {
    const r = await saveWaSetup({ ...cfg, provider }, token());
    if (r.ok) { setEdit(null); await reload(); await check(); }
    return { ok: r.ok, text: r.ok ? "Saved. Used by every WhatsApp send from now on." : (r.error ?? "Save failed") };
  });

  return (
    <div className="grid lg:grid-cols-2 gap-3">
      <div className="space-y-3">
        <Card title="Connection" right={<Btn tone="gold" disabled={busy === "test"} onClick={check}>{busy === "test" ? "Checking…" : "Test connection"}</Btn>}>
          {!status && <p className="text-[11px] text-slate-400">{loaded.configured ? <>Active provider: <b className="text-white">{loaded.effective}</b> — press “Test connection” to verify it live.</> : "WhatsApp is not connected yet. Choose a provider below, enter the details and save."}</p>}
          {status && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2"><Badge tone={status.ok ? "green" : status.error ? "red" : "amber"}>{status.ok ? "Connected" : status.error ? "Problem" : "Not ready"}</Badge><span className="text-[10px] text-slate-500">via {status.provider}{status.source === "env" ? " (from .env)" : status.source === "crm" ? " (saved in CRM)" : ""}</span></div>
              {status.error && <p className="text-[11px] text-rose-400">{status.error}</p>}
              {status.lines.map((l) => <div key={l.label} className="flex justify-between text-[11px] border-b border-white/[0.04] py-1"><span className="text-slate-500">{l.label}</span><span className={l.tone ? toneCls[l.tone] : "text-slate-200"}>{l.value}</span></div>)}
              {status.qr && status.qr.state !== "open" && (
                <div className="text-center pt-2">
                  {status.qr.dataUrl
                    ? <>
                      {/* eslint-disable-next-line @next/next/no-img-element -- data: URL from the QR service */}
                      <img src={status.qr.dataUrl} alt="WhatsApp QR code" width={220} height={220} className="mx-auto rounded-lg bg-white p-2" />
                      <p className="text-[10px] text-slate-400 mt-1">WhatsApp ▸ Settings ▸ Linked devices ▸ Link a device — scan this code.</p></>
                    : <p className="text-[11px] text-slate-400">Waiting for the QR service ({status.qr.state})…</p>}
                </div>
              )}
              {status.qr?.state === "open" && <Btn tone="danger" disabled={busy === "logout"} onClick={() => run("logout", async () => { const r = await logoutWaQr(token()); await check(); return { ok: r.ok, text: r.ok ? "Number unlinked. Scan again to link another." : (r.error ?? "Failed") }; })}>Unlink this number</Btn>}
            </div>
          )}
        </Card>

        <Card title="1 · Choose how to connect your business number">
          <div className="space-y-2">
            {PROVIDERS.map((p) => (
              <button key={p.id} type="button" onClick={() => up((c) => { c.provider = p.id; })}
                className={`w-full text-left rounded-lg border p-2.5 transition-colors ${provider === p.id ? "border-[#c9a84c]/60 bg-[#c9a84c]/[0.06]" : "border-white/[0.08] hover:bg-white/[0.03]"}`}>
                <div className="flex items-center gap-2"><span className="text-[11px] font-semibold text-white">{p.title}</span><Badge tone={p.tone}>{p.badge}</Badge>{loaded.effective === p.id && loaded.configured && <Badge tone="gold">active</Badge>}</div>
                <p className="text-[10px] text-slate-400 mt-1">{p.desc}</p>
              </button>
            ))}
          </div>
        </Card>

        {provider === "cloud" && (
          <Card title="2 · Meta Cloud API details">
            <p className="text-[10px] text-slate-500 mb-2">developers.facebook.com → your app → WhatsApp → API Setup. Use a <b>permanent</b> System-User token. {loaded.envHints.cloud && "Values left empty fall back to .env."}</p>
            <div className="space-y-2">
              <Field label="Access token (permanent)"><input type="password" autoComplete="off" className={inputCls} value={cfg.cloud.token} onChange={(e) => up((c) => { c.cloud.token = e.target.value; })} placeholder="EAAG…" /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Phone number ID"><input className={inputCls} value={cfg.cloud.phoneNumberId} onChange={(e) => up((c) => { c.cloud.phoneNumberId = e.target.value; })} /></Field>
                <Field label="WhatsApp Business Account (WABA) ID"><input className={inputCls} value={cfg.cloud.wabaId} onChange={(e) => up((c) => { c.cloud.wabaId = e.target.value; })} /></Field>
              </div>
              <Field label="App secret (verifies inbound webhooks)"><input type="password" autoComplete="off" className={inputCls} value={cfg.cloud.appSecret} onChange={(e) => up((c) => { c.cloud.appSecret = e.target.value; })} /></Field>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2"><Field label="Fallback template (24h window closed) — body just {{1}}"><input className={inputCls} value={cfg.cloud.templateName} onChange={(e) => up((c) => { c.cloud.templateName = e.target.value; })} placeholder="optional" /></Field></div>
                <Field label="Language"><input className={inputCls} value={cfg.cloud.templateLang} onChange={(e) => up((c) => { c.cloud.templateLang = e.target.value; })} /></Field>
              </div>
            </div>
          </Card>
        )}

        {provider === "qr" && (
          <Card title="2 · QR service details">
            <p className="text-[10px] text-amber-400/90 mb-2">⚠ Unofficial — WhatsApp may ban numbers used for bulk messages. Use a number you can afford to lose, or use the Cloud API.</p>
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-700 p-2 text-[11px] text-slate-300 flex items-center gap-2 flex-wrap">
                <span>Local testing? Terminal mein <code>npm run wa-qr</code> chalao, phir:</span>
                <Btn type="button" onClick={() => up((c) => { c.qr.url = "http://localhost:4002"; c.qr.secret = "kvl-local-wa-secret-2026"; })}>Use local defaults</Btn>
              </div>
              <Field label="Service URL (HTTPS in production) — where /whatsapp-qr runs"><input className={inputCls} value={cfg.qr.url} onChange={(e) => up((c) => { c.qr.url = e.target.value; })} placeholder="https://wa.yourdomain.com" /></Field>
              <Field label="Shared secret (same as WHATSAPP_QR_SECRET on the service, 16+ chars)">
                <div className="flex gap-1.5"><input type="password" autoComplete="off" className={inputCls} value={cfg.qr.secret} onChange={(e) => up((c) => { c.qr.secret = e.target.value; })} /><Btn type="button" onClick={() => up((c) => { c.qr.secret = rand(); })}>Generate</Btn></div>
              </Field>
              <p className="text-[10px] text-slate-500">Service must run with <code>CRM_URL={origin}</code> so replies reach this CRM. After saving, press “Test connection” — the QR appears here.</p>
            </div>
          </Card>
        )}

        {provider === "twilio" && (
          <Card title="2 · Twilio details">
            <Field label="WhatsApp sender number"><input className={inputCls} value={cfg.twilio.from} onChange={(e) => up((c) => { c.twilio.from = e.target.value; })} placeholder="whatsapp:+14155238886" /></Field>
            <p className="text-[10px] text-slate-500 mt-1.5">TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are read from .env ({loaded.envHints.twilio && loaded.envHints.twilioToken ? "found ✓" : "not found — add them"}). Inbound webhook: <code>{origin}/api/whatsapp/inbound</code></p>
          </Card>
        )}

        <Card title="Sending limits & defaults">
          <div className="grid grid-cols-3 gap-2">
            <Field label="Broadcast cap / 24h (0 = no cap)"><input type="number" min={0} className={inputCls} value={cfg.limits.broadcastDailyCap} onChange={(e) => up((c) => { c.limits.broadcastDailyCap = Number(e.target.value); })} /></Field>
            <Field label="Gap between sends (ms)"><input type="number" min={0} className={inputCls} value={cfg.limits.gapMs} onChange={(e) => up((c) => { c.limits.gapMs = Number(e.target.value); })} /></Field>
            <Field label="Default country code"><input className={inputCls} value={cfg.limits.defaultCountryCode} onChange={(e) => up((c) => { c.limits.defaultCountryCode = e.target.value; })} /></Field>
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">Meta starts new numbers at ~250–1,000 business-initiated chats / 24h and raises it with good quality. Keep the cap at or below your tier.</p>
        </Card>

        <div className="flex items-center gap-2"><Btn tone="gold" disabled={busy === "save"} onClick={save}>{busy === "save" ? "Saving…" : "Save settings"}</Btn>{edit && <Btn onClick={() => setEdit(null)}>Discard</Btn>}{msg && <span className={`text-[11px] ${msg.ok ? "text-emerald-400" : "text-rose-400"}`}>{msg.text}</span>}</div>
      </div>

      <div className="space-y-3">
        {provider === "cloud" && (
          <Card title="3 · Webhook (so replies & read receipts reach the CRM)">
            <p className="text-[10px] text-slate-500 mb-2">Meta → WhatsApp → Configuration → Webhook. Subscribe to the <b>messages</b> field.</p>
            <div className="space-y-2">
              <Field label="Callback URL"><div className="flex gap-1.5"><input readOnly className={inputCls} value={`${origin}/api/whatsapp/cloud`} /><Btn type="button" onClick={() => navigator.clipboard?.writeText(`${origin}/api/whatsapp/cloud`)}>Copy</Btn></div></Field>
              <Field label="Verify token (you choose it — paste the same value in Meta)">
                <div className="flex gap-1.5"><input className={inputCls} value={cfg.cloud.verifyToken} onChange={(e) => up((c) => { c.cloud.verifyToken = e.target.value; })} /><Btn type="button" onClick={() => up((c) => { c.cloud.verifyToken = rand(); })}>Generate</Btn></div>
              </Field>
              <p className="text-[10px] text-slate-500">Save first, then click “Verify and save” in Meta.</p>
            </div>
          </Card>
        )}
        {provider === "cloud" && (
          <Card title="Templates (needed to message people outside the 24h window)">
            <p className="text-[11px] text-slate-400 mb-2">Pulls all your Meta templates (name, language, body, approved status) into <b>Templates</b>, ready to use in Broadcasts and Follow-ups. Create new templates in Meta Business Manager.</p>
            <Btn disabled={busy === "sync"} onClick={() => run("sync", async () => { const r = await syncMetaTemplates(token()); return { ok: r.ok, text: r.ok ? `Synced: ${r.added} new, ${r.updated} updated (${r.approved} approved).` : (r.error ?? "Sync failed") }; })}>{busy === "sync" ? "Syncing…" : "Sync templates from Meta"}</Btn>
          </Card>
        )}
        <Card title="Send a test message">
          <div className="space-y-2">
            <Field label="Your WhatsApp number"><input className={inputCls} value={test.phone} onChange={(e) => setTest({ ...test, phone: e.target.value })} placeholder="+91 98123 45678" /></Field>
            <Field label="Message (optional)"><input className={inputCls} value={test.text} onChange={(e) => setTest({ ...test, text: e.target.value })} placeholder="✅ Test message from your CRM" /></Field>
            <Btn disabled={busy === "tmsg" || !test.phone.trim()} onClick={() => run("tmsg", async () => { const r = await sendWaTest(test.phone, test.text, token()); return { ok: r.ok, text: r.detail }; })}>{busy === "tmsg" ? "Sending…" : "Send test"}</Btn>
            <p className="text-[10px] text-slate-500">Save settings first. On the Cloud API the number must have messaged you in the last 24h, or use a template.</p>
          </div>
        </Card>
        <Card title="How it works">
          <ul className="text-[10px] text-slate-400 space-y-1 list-disc pl-4">
            <li>Settings saved here are used by <b>every</b> WhatsApp send: Inbox replies, Broadcasts, Follow-ups, Workflows, reminders.</li>
            <li>Tokens are encrypted in the database and never shown again (only the last 4 characters).</li>
            <li>Anything left empty falls back to the matching <code>.env</code> variable.</li>
            <li>Opt-outs (STOP) are honoured automatically on every send.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
