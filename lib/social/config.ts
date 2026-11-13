// Social account credentials saved from the CRM (comms_settings, key "social_config"), so a token can be
// pasted into Social Media ▸ Connect Accounts instead of editing .env on the server.
//
// Precedence: a non-empty value saved here overrides the matching .env variable; anything left empty falls
// back to .env (existing deployments keep working untouched). Secrets are AES-256-GCM encrypted at rest.
// Server-only. Never throws.

import { getDb, dbConfigured } from "@/lib/db";
import { MASK, encryptSecret, decryptSecret, encryptionAvailable } from "@/lib/security/secretBox";

export interface SocialConfig {
  meta: { pageId: string; pageToken: string; igUserId: string; appId: string; appSecret: string };
  linkedin: { token: string; orgUrn: string; apiVersion: string };
  twitter: { apiKey: string; apiSecret: string; accessToken: string; accessSecret: string };
}
export type SocialGroup = keyof SocialConfig;

export const EMPTY_SOCIAL_CONFIG: SocialConfig = {
  meta: { pageId: "", pageToken: "", igUserId: "", appId: "", appSecret: "" },
  linkedin: { token: "", orgUrn: "", apiVersion: "" },
  twitter: { apiKey: "", apiSecret: "", accessToken: "", accessSecret: "" },
};

/** Fields that are credentials: encrypted at rest and masked in the browser. */
export const SECRET_FIELDS: Array<[SocialGroup, string]> = [
  ["meta", "pageToken"], ["meta", "appSecret"], ["linkedin", "token"],
  ["twitter", "apiKey"], ["twitter", "apiSecret"], ["twitter", "accessToken"], ["twitter", "accessSecret"],
];

/** Environment variable each field falls back to. */
export const ENV_NAMES: Record<SocialGroup, Record<string, string>> = {
  meta: { pageId: "META_PAGE_ID", pageToken: "META_PAGE_ACCESS_TOKEN", igUserId: "META_INSTAGRAM_USER_ID", appId: "META_APP_ID", appSecret: "META_APP_SECRET" },
  linkedin: { token: "LINKEDIN_ACCESS_TOKEN", orgUrn: "LINKEDIN_ORGANIZATION_URN", apiVersion: "LINKEDIN_API_VERSION" },
  twitter: { apiKey: "TWITTER_API_KEY", apiSecret: "TWITTER_API_SECRET", accessToken: "TWITTER_ACCESS_TOKEN", accessSecret: "TWITTER_ACCESS_SECRET" },
};

const KEY = "social_config";
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const rec = (o: unknown) => o as Record<string, string>;

function merge(base: SocialConfig, saved: Partial<SocialConfig>): SocialConfig {
  const out = clone(base);
  for (const g of Object.keys(out) as SocialGroup[]) {
    const src = (saved[g] ?? {}) as Record<string, unknown>;
    for (const k of Object.keys(out[g])) if (typeof src[k] === "string") rec(out[g])[k] = src[k] as string;
  }
  return out;
}

/** Trims every value, turns a bare LinkedIn page number into a URN, and validates the API version. */
export function normalizeSocialConfig(c: SocialConfig): SocialConfig {
  const out = clone(c);
  for (const g of Object.keys(out) as SocialGroup[]) for (const k of Object.keys(out[g])) rec(out[g])[k] = String(rec(out[g])[k] ?? "").trim();
  out.meta.pageId = out.meta.pageId.replace(/\D/g, "");
  out.meta.igUserId = out.meta.igUserId.replace(/\D/g, "");
  const org = out.linkedin.orgUrn;
  if (/^\d+$/.test(org)) out.linkedin.orgUrn = `urn:li:organization:${org}`;
  if (!/^\d{6}$/.test(out.linkedin.apiVersion)) out.linkedin.apiVersion = "";
  return out;
}

let cache: { at: number; cfg: SocialConfig } | null = null;
const TTL_MS = 10_000;

/** The saved config (secrets decrypted). Cached for 10 s per server instance. */
export async function loadSocialConfig(force = false): Promise<SocialConfig> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.cfg;
  let cfg = clone(EMPTY_SOCIAL_CONFIG);
  if (dbConfigured()) {
    try {
      const { data } = await getDb().from("comms_settings").select("value").eq("key", KEY).maybeSingle();
      if (data?.value) {
        cfg = merge(cfg, data.value as Partial<SocialConfig>);
        for (const [g, k] of SECRET_FIELDS) rec(cfg[g])[k] = decryptSecret(rec(cfg[g])[k]);
      }
    } catch (err) { console.error("[social-config] load failed:", err); }
  }
  cache = { at: Date.now(), cfg };
  return cfg;
}

/** Saves a patch. Empty / masked ("••••1234") secret fields keep the stored value. */
export async function saveSocialConfig(patch: Partial<SocialConfig>): Promise<{ ok: boolean; error?: string }> {
  if (!dbConfigured()) return { ok: false, error: "The database isn't configured." };
  try {
    const current = await loadSocialConfig(true);
    const next = merge(current, patch);
    for (const [g, k] of SECRET_FIELDS) {
      const incoming = String(rec((patch[g] ?? {}) as object)[k] ?? "");
      if (!incoming || incoming.startsWith(MASK)) rec(next[g])[k] = rec(current[g])[k];
    }
    const clean = normalizeSocialConfig(next);
    if (SECRET_FIELDS.some(([g, k]) => rec(clean[g])[k]) && !encryptionAvailable()) {
      return { ok: false, error: "Set AUTH_JWT_SECRET (or SOCIAL_CONFIG_KEY) on the server first, so tokens can be encrypted before they are stored." };
    }
    const stored = clone(clean);
    for (const [g, k] of SECRET_FIELDS) rec(stored[g])[k] = encryptSecret(rec(clean[g])[k]);
    const { error } = await getDb().from("comms_settings").upsert({ key: KEY, value: stored, updated_at: new Date().toISOString() });
    if (error) { console.error("[social-config] save failed:", error.message); return { ok: false, error: "Could not save to the database." }; }
    cache = null;
    return { ok: true };
  } catch (err) { console.error("[social-config] save error:", err); return { ok: false, error: "Could not save to the database." }; }
}

/** Clears everything saved for one group (falls back to .env afterwards, if set there). */
export async function clearSocialGroup(group: SocialGroup): Promise<boolean> {
  if (!dbConfigured()) return false;
  try {
    // Not saveSocialConfig: it keeps stored secrets when the incoming value is empty.
    const wiped = clone(await loadSocialConfig(true)) as unknown as Record<string, unknown>;
    wiped[group] = clone(EMPTY_SOCIAL_CONFIG[group]);
    const stored = clone(wiped) as unknown as SocialConfig;
    for (const [g, k] of SECRET_FIELDS) rec(stored[g])[k] = encryptSecret(rec(stored[g])[k]);
    const { error } = await getDb().from("comms_settings").upsert({ key: KEY, value: stored, updated_at: new Date().toISOString() });
    cache = null;
    return !error;
  } catch (err) { console.error("[social-config] clear error:", err); return false; }
}

/** Config for the browser: secrets replaced by "••••" + last 4 characters. */
export function maskSocialConfig(cfg: SocialConfig): SocialConfig {
  const out = clone(cfg);
  for (const [g, k] of SECRET_FIELDS) { const v = rec(out[g])[k]; rec(out[g])[k] = v ? `${MASK}${v.slice(-4)}` : ""; }
  return out;
}

/** `process.env` overlaid with whatever is saved in the CRM — what the publishers and connection checks read. */
export async function socialEnv(): Promise<NodeJS.ProcessEnv> {
  const c = await loadSocialConfig();
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const g of Object.keys(ENV_NAMES) as SocialGroup[]) {
    for (const [field, name] of Object.entries(ENV_NAMES[g])) { const v = rec(c[g])[field]; if (v) env[name] = v; }
  }
  return env;
}

/** Where a group's credentials come from right now. */
export function sourceOf(group: SocialGroup, cfg: SocialConfig): "crm" | "env" | "none" {
  if (Object.values(cfg[group]).some(Boolean)) return "crm";
  if (Object.values(ENV_NAMES[group]).some((n) => process.env[n])) return "env";
  return "none";
}
