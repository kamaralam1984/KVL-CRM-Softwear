// WhatsApp connection settings stored in the DB (comms_settings, key "whatsapp_config"), so the
// business number can be set from the CRM instead of editing .env and redeploying.
//
// Precedence: a non-empty value saved in the CRM overrides the same .env variable; anything left
// empty falls back to .env (so existing deployments keep working untouched).
// Secrets (tokens) are AES-256-GCM encrypted at rest with WA_CONFIG_KEY (or AUTH_JWT_SECRET).
// Server-only. Never throws.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { getDb, dbConfigured } from "@/lib/db";

export type WaProviderChoice = "" | "cloud" | "qr" | "twilio";

export interface WaConfig {
  provider: WaProviderChoice;
  cloud: { token: string; phoneNumberId: string; wabaId: string; verifyToken: string; appSecret: string; templateName: string; templateLang: string };
  qr: { url: string; secret: string };
  twilio: { from: string };
  limits: {
    /** Max broadcast messages per rolling 24h (0 = unlimited). Meta new accounts start at 250–1000. */
    broadcastDailyCap: number;
    /** Pause between broadcast sends (ms). The QR service adds its own human-like 4–9 s gap on top. */
    gapMs: number;
    /** Prepended to 10-digit numbers when importing/pasting contacts. */
    defaultCountryCode: string;
  };
}

export const EMPTY_WA_CONFIG: WaConfig = {
  provider: "",
  cloud: { token: "", phoneNumberId: "", wabaId: "", verifyToken: "", appSecret: "", templateName: "", templateLang: "en" },
  qr: { url: "", secret: "" },
  twilio: { from: "" },
  limits: { broadcastDailyCap: 1000, gapMs: 150, defaultCountryCode: "91" },
};

const KEY = "whatsapp_config";
const MASK = "••••";
const SECRET_FIELDS: Array<[keyof WaConfig, string]> = [["cloud", "token"], ["cloud", "appSecret"], ["cloud", "verifyToken"], ["qr", "secret"]];

// ── encryption ───────────────────────────────────────────────────────────────
function cryptoKey(): Buffer | null {
  const raw = process.env.WA_CONFIG_KEY ?? process.env.AUTH_JWT_SECRET;
  return raw ? createHash("sha256").update(raw).digest() : null;
}
function enc(plain: string): string {
  const key = cryptoKey();
  if (!plain || !key) return plain;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `enc:v1:${Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64")}`;
}
function dec(value: string): string {
  if (!value.startsWith("enc:v1:")) return value;
  const key = cryptoKey();
  if (!key) return "";
  try {
    const buf = Buffer.from(value.slice(7), "base64");
    const d = createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
  } catch { console.error("[wa-config] could not decrypt a saved secret (key changed?) — re-enter it in WhatsApp Setup"); return ""; }
}

// ── load / save ──────────────────────────────────────────────────────────────
const get = (o: unknown, k: string) => (o as Record<string, string>)[k];
const set = (o: unknown, k: string, v: string) => { (o as Record<string, string>)[k] = v; };
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

let cache: { at: number; cfg: WaConfig } | null = null;
const TTL_MS = 10_000;

function merge(base: WaConfig, saved: Partial<WaConfig>): WaConfig {
  const out = clone(base);
  if (saved.provider === "cloud" || saved.provider === "qr" || saved.provider === "twilio" || saved.provider === "") out.provider = saved.provider;
  for (const g of ["cloud", "qr", "twilio", "limits"] as const) {
    const src = (saved[g] ?? {}) as Record<string, unknown>;
    for (const k of Object.keys(out[g])) if (src[k] !== undefined && src[k] !== null) (out[g] as unknown as Record<string, unknown>)[k] = src[k];
  }
  return out;
}

/** The saved config (secrets decrypted). Cached for 10 s per server instance. */
export async function loadWaConfig(force = false): Promise<WaConfig> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.cfg;
  let cfg = clone(EMPTY_WA_CONFIG);
  if (dbConfigured()) {
    try {
      const { data } = await getDb().from("comms_settings").select("value").eq("key", KEY).maybeSingle();
      if (data?.value) {
        cfg = merge(cfg, data.value as Partial<WaConfig>);
        for (const [g, k] of SECRET_FIELDS) set(cfg[g], k, dec(get(cfg[g], k)));
      }
    } catch (err) { console.error("[wa-config] load failed:", err); }
  }
  cache = { at: Date.now(), cfg };
  return cfg;
}

/** Saves a patch. Empty / masked ("••••1234") secret fields keep the stored value. */
export async function saveWaConfig(patch: Partial<WaConfig>): Promise<boolean> {
  if (!dbConfigured()) return false;
  try {
    const current = await loadWaConfig(true);
    const next = merge(current, patch);
    for (const [g, k] of SECRET_FIELDS) {
      const incoming = String(get((patch[g] ?? {}) as object, k) ?? "");
      if (!incoming || incoming.startsWith(MASK)) set(next[g], k, get(current[g], k));
    }
    next.limits.broadcastDailyCap = Math.max(0, Math.floor(Number(next.limits.broadcastDailyCap) || 0));
    next.limits.gapMs = Math.min(60_000, Math.max(0, Math.floor(Number(next.limits.gapMs) || 0)));
    next.limits.defaultCountryCode = String(next.limits.defaultCountryCode).replace(/\D/g, "");
    next.qr.url = next.qr.url.trim().replace(/\/$/, "");
    const stored = clone(next);
    for (const [g, k] of SECRET_FIELDS) set(stored[g], k, enc(get(next[g], k)));
    const { error } = await getDb().from("comms_settings").upsert({ key: KEY, value: stored, updated_at: new Date().toISOString() });
    if (error) { console.error("[wa-config] save failed:", error.message); return false; }
    cache = null;
    return true;
  } catch (err) { console.error("[wa-config] save error:", err); return false; }
}

/** Config for the browser: secrets replaced by "••••" + last 4 characters. */
export function maskWaConfig(cfg: WaConfig): WaConfig {
  const out = clone(cfg);
  for (const [g, k] of SECRET_FIELDS) { const v = get(out[g], k); set(out[g], k, v ? `${MASK}${v.slice(-4)}` : ""); }
  return out;
}

/** `process.env` overlaid with whatever is saved in the CRM — pass to the senders in whatsappProviders.ts. */
export async function waEnv(): Promise<NodeJS.ProcessEnv> {
  const c = await loadWaConfig();
  const env: NodeJS.ProcessEnv = { ...process.env };
  const put = (name: string, v: string) => { if (v) env[name] = v; };
  put("WHATSAPP_PROVIDER", c.provider);
  put("WHATSAPP_CLOUD_TOKEN", c.cloud.token);
  put("WHATSAPP_CLOUD_PHONE_NUMBER_ID", c.cloud.phoneNumberId);
  put("WHATSAPP_CLOUD_WABA_ID", c.cloud.wabaId);
  put("WHATSAPP_CLOUD_VERIFY_TOKEN", c.cloud.verifyToken);
  put("META_APP_SECRET", c.cloud.appSecret);
  put("WHATSAPP_CLOUD_TEMPLATE_NAME", c.cloud.templateName);
  put("WHATSAPP_CLOUD_TEMPLATE_LANG", c.cloud.templateLang);
  put("WHATSAPP_QR_URL", c.qr.url);
  put("WHATSAPP_QR_SECRET", c.qr.secret);
  put("TWILIO_WHATSAPP_FROM", c.twilio.from);
  return env;
}
