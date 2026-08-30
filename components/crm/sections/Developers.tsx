"use client";
// Phase 40 — Public API + Outbound Webhooks (Marketplace Foundation). New
// section. Ships the INFRASTRUCTURE a marketplace needs — scoped API keys,
// an outbound webhook fan-out — not a claim of GoHighLevel's actual
// app-catalog scale, which comes from years of external developer
// adoption no code can manufacture. See docs/GHL_PARITY_STATUS.md.

import { useState, useEffect } from "react";
import { Webhook, Plus, Copy, Check, Key, Trash2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import {
  getApiKeys, createApiKey, revokeApiKey, type ApiKey,
} from "@/lib/actions/apiKeys";
import {
  getWebhooks, createWebhookSubscription, deleteWebhook, getWebhookDeliveries,
  type Webhook as WebhookRow, type WebhookDelivery,
} from "@/lib/actions/webhooks";
import { getAccessToken } from "@/lib/security/clientSession";

const GOLD = "#D4AF37";
const EMERALD = "#00A86B";

type EventKey = "lead.created" | "deal.won" | "order.paid";

const EVENT_OPTIONS: { key: EventKey; label: string }[] = [
  { key: "lead.created", label: "Lead Created" },
  { key: "deal.won", label: "Deal Won" },
  { key: "order.paid", label: "Order Paid" },
];

function ApiKeysCard() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () => getApiKeys(getAccessToken()).then(setKeys).catch(() => {});
  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const create = async () => {
    const res = await createApiKey(name.trim() || "Unnamed key", getAccessToken());
    if (res.ok && res.plainKey) { setNewKey(res.plainKey); setName(""); load(); }
  };

  const revoke = async (id: string) => {
    const res = await revokeApiKey(id, getAccessToken());
    if (res.ok) setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, active: false } : k)));
  };

  const copyKey = () => {
    if (!newKey) return;
    navigator.clipboard?.writeText(newKey).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="glass-card rounded-2xl border border-crm-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Key size={14} style={{ color: GOLD }} />
        <p className="text-sm font-bold text-slate-200">API Keys</p>
      </div>
      <p className="text-[10px] text-slate-500 mb-3">
        Authenticate against <code className="text-slate-400">/api/v1/{"{leads,contacts,deals}"}</code> with{" "}
        <code className="text-slate-400">Authorization: Bearer &lt;key&gt;</code>.
      </p>

      {newKey && (
        <div className="rounded-xl border p-3 mb-3" style={{ background: "rgba(212,175,55,0.08)", borderColor: "rgba(212,175,55,0.3)" }}>
          <p className="text-[10px] text-amber-300 mb-1.5">Copy this now — it won&apos;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-slate-200 font-mono truncate">{newKey}</code>
            <button onClick={copyKey} className="text-slate-400 hover:text-amber-300 transition-colors">
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 mb-3">
        <input placeholder="Key name (e.g. Zapier)" value={name} onChange={(e) => setName(e.target.value)}
          className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
        <button onClick={create} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-black" style={{ background: GOLD }}>
          <Plus size={12} /> Create
        </button>
      </div>

      <div className="space-y-1.5">
        {keys.map((k) => (
          <div key={k.id} className="flex items-center justify-between text-xs p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div>
              <p className="text-slate-300 font-medium">{k.name}</p>
              <p className="text-[10px] text-slate-500 font-mono">{k.key_prefix}…</p>
            </div>
            {k.active ? (
              <button onClick={() => revoke(k.id)} className="flex items-center gap-1 text-[10px] font-semibold text-rose-400 hover:text-rose-300 transition-colors">
                <Trash2 size={11} /> Revoke
              </button>
            ) : (
              <span className="text-[10px] text-slate-600">Revoked</span>
            )}
          </div>
        ))}
        {loading && <p className="text-xs text-slate-600">Loading…</p>}
        {!loading && keys.length === 0 && <p className="text-xs text-slate-600">No API keys yet.</p>}
      </div>
    </div>
  );
}

// Gap-check fix: getWebhookDeliveries existed in lib/actions/webhooks.ts but
// had no UI calling it anywhere. Small expand-on-click delivery log, matching
// the "surface the debugging data that already exists" pattern the earlier
// gap-check round used for sendReviewRequest/updateProduct.
function DeliveryHistory({ webhookId }: { webhookId: string }) {
  const [open, setOpen] = useState(false);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[] | null>(null);

  const toggle = () => {
    if (!open && deliveries === null) {
      getWebhookDeliveries(webhookId, getAccessToken()).then(setDeliveries).catch(() => setDeliveries([]));
    }
    setOpen((o) => !o);
  };

  return (
    <div className="mt-1.5">
      <button onClick={toggle} className="flex items-center gap-1 text-[9px] text-slate-500 hover:text-slate-300 transition-colors">
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />} Delivery history
      </button>
      {open && (
        <div className="mt-1 space-y-1">
          {deliveries === null ? (
            <p className="text-[9px] text-slate-600">Loading…</p>
          ) : deliveries.length === 0 ? (
            <p className="text-[9px] text-slate-600">No deliveries yet.</p>
          ) : (
            deliveries.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-[9px] px-1.5 py-1 rounded" style={{ background: "rgba(255,255,255,0.02)" }}>
                <span className="text-slate-500 font-mono">{d.event}</span>
                <span className="text-slate-600">{new Date(d.created_at).toLocaleString()}</span>
                <span className={d.ok ? "text-emerald-400" : "text-rose-400"}>{d.ok ? "✓" : "✗"} {d.status_code || "no response"}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function WebhooksCard() {
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<Set<EventKey>>(new Set(["lead.created"]));
  const [error, setError] = useState("");

  const load = () => getWebhooks(getAccessToken()).then(setWebhooks).catch(() => {});
  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const toggleEvent = (key: EventKey) => {
    setEvents((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const create = async () => {
    if (!url.trim() || events.size === 0) return;
    setError("");
    const res = await createWebhookSubscription(url.trim(), [...events], getAccessToken());
    if (res.ok) { setUrl(""); load(); }
    else setError("Couldn't add that webhook — check it's a valid https:// URL pointing to a public host.");
  };

  const remove = async (id: string) => {
    const res = await deleteWebhook(id, getAccessToken());
    if (res.ok) setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <div className="glass-card rounded-2xl border border-crm-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Webhook size={14} style={{ color: EMERALD }} />
        <p className="text-sm font-bold text-slate-200">Outbound Webhooks</p>
      </div>
      <p className="text-[10px] text-slate-500 mb-3">
        We&apos;ll POST a JSON body, HMAC-SHA256-signed (header <code className="text-slate-400">X-KVL-Signature</code>), to your endpoint.
      </p>

      <div className="space-y-2 mb-3">
        <input placeholder="https://your-app.com/webhooks/kvl" value={url} onChange={(e) => setUrl(e.target.value)}
          className="w-full px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
        <div className="flex flex-wrap gap-2">
          {EVENT_OPTIONS.map((e) => (
            <button key={e.key} onClick={() => toggleEvent(e.key)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all"
              style={{
                background: events.has(e.key) ? "rgba(0,168,107,0.12)" : "rgba(255,255,255,0.03)",
                borderColor: events.has(e.key) ? "rgba(0,168,107,0.4)" : "rgba(255,255,255,0.08)",
                color: events.has(e.key) ? EMERALD : "#64748b",
              }}>
              {e.label}
            </button>
          ))}
        </div>
        <button onClick={create} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-black" style={{ background: GOLD }}>
          <Plus size={12} /> Add Webhook
        </button>
        {error && <p className="text-[10px] text-rose-400">{error}</p>}
      </div>

      <div className="space-y-1.5">
        {webhooks.map((w) => (
          <div key={w.id} className="p-2 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="flex items-center justify-between">
              <span className="text-slate-300 truncate font-mono">{w.endpoint_url}</span>
              <button onClick={() => remove(w.id)} className="text-rose-400 hover:text-rose-300 transition-colors flex-shrink-0 ml-2">
                <Trash2 size={11} />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {w.events.map((ev) => (
                <span key={ev} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(212,175,55,0.1)", color: GOLD }}>{ev}</span>
              ))}
              <span className="text-[9px] text-slate-600 ml-auto font-mono">secret: {w.signing_secret.slice(0, 8)}…</span>
            </div>
            <DeliveryHistory webhookId={w.id} />
          </div>
        ))}
        {loading && <p className="text-xs text-slate-600">Loading…</p>}
        {!loading && webhooks.length === 0 && <p className="text-xs text-slate-600">No webhooks configured.</p>}
      </div>
    </div>
  );
}

export default function Developers() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-crm-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: GOLD + "20", border: `1px solid ${GOLD}33` }}>
            <Webhook size={16} style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-sm font-black text-white">Developers</h1>
            <p className="text-[10px] text-slate-500">Public API keys and outbound webhooks</p>
          </div>
        </div>
        <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-1.5 text-[10px] text-slate-500">
          /api/v1/leads · /api/v1/contacts · /api/v1/deals <ExternalLink size={10} />
        </a>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <ApiKeysCard />
        <WebhooksCard />
        <p className="text-[9px] text-slate-600 leading-relaxed px-1">
          This gives Maxness the same technical building blocks a marketplace needs. It does not, by itself, create the
          catalog of 3rd-party apps a mature platform accumulates over years of external developer adoption — that
          part isn&apos;t something any amount of code can manufacture.
        </p>
      </div>
    </div>
  );
}
