"use server";
// Social Media ▸ Connect Accounts — server actions. Credentials are high-sensitivity, so every action needs
// a real login (assertCanStrict). Tokens are encrypted in the database and never sent back to the browser
// unmasked; the Meta "find my Pages" helper keeps the Page token on the server.

import { assertCanStrict } from "@/lib/security/requireAction";
import { rateLimit } from "@/lib/security/rateLimit";
import { encryptionAvailable } from "@/lib/security/secretBox";
import {
  loadSocialConfig, saveSocialConfig, clearSocialGroup, maskSocialConfig, socialEnv, sourceOf, ENV_NAMES,
  type SocialConfig, type SocialGroup,
} from "@/lib/social/config";
import { platformConnection } from "@/lib/social/connections";
import { buildTwitterOAuthHeader } from "@/lib/social/twitterOAuth";
import { DEFAULT_LINKEDIN_API_VERSION } from "@/lib/social/publish";
import type { SocialPlatform } from "@/lib/social/validate";

const GRAPH = "https://graph.facebook.com/v21.0";
const guard = (t: string | undefined) => assertCanStrict(t, "social", "update");
const DENIED = "Sign in with an admin account to manage social connections.";
type Json = Record<string, unknown>;
type Line = { label: string; value: string; tone?: "green" | "amber" | "red" };

export interface SocialSetup {
  config: SocialConfig;                                   // secrets masked
  source: Record<SocialGroup, "crm" | "env" | "none">;
  envHints: Record<SocialGroup, Record<string, boolean>>; // which fields also exist in .env
  connected: Record<SocialPlatform, boolean>;
  encryption: boolean;
  defaultLinkedinVersion: string;
}
export interface SocialTest { ok: boolean; lines: Line[]; error?: string; testedAt: number }

export async function getSocialSetup(token?: string): Promise<SocialSetup | null> {
  if (!(await guard(token))) return null;
  const cfg = await loadSocialConfig(true);
  const env = await socialEnv();
  const envHints = Object.fromEntries((Object.keys(ENV_NAMES) as SocialGroup[]).map((g) => [
    g, Object.fromEntries(Object.entries(ENV_NAMES[g]).map(([f, n]) => [f, Boolean(process.env[n])])),
  ])) as SocialSetup["envHints"];
  return {
    config: maskSocialConfig(cfg),
    source: { meta: sourceOf("meta", cfg), linkedin: sourceOf("linkedin", cfg), twitter: sourceOf("twitter", cfg) },
    envHints,
    connected: {
      facebook: platformConnection("facebook", env).connected, instagram: platformConnection("instagram", env).connected,
      linkedin: platformConnection("linkedin", env).connected, twitter: platformConnection("twitter", env).connected,
    },
    encryption: encryptionAvailable(),
    defaultLinkedinVersion: DEFAULT_LINKEDIN_API_VERSION,
  };
}

export async function saveSocialSetup(patch: Partial<SocialConfig>, token?: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await guard(token))) return { ok: false, error: DENIED };
  return saveSocialConfig(patch);
}

export async function disconnectSocial(group: SocialGroup, token?: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await guard(token))) return { ok: false, error: DENIED };
  if (!(group in ENV_NAMES)) return { ok: false, error: "Unknown platform." };
  return (await clearSocialGroup(group)) ? { ok: true } : { ok: false, error: "Could not disconnect." };
}

async function fetchJson(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; json: Json; headers: Headers }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  return { ok: res.ok, status: res.status, json: (await res.json().catch(() => ({}))) as Json, headers: res.headers };
}
const metaErr = (j: Json) => String((j.error as Json | undefined)?.message ?? "unknown error");

/** Meta token health via debug_token — needs the App ID + App Secret (advanced). */
async function metaTokenLines(token: string, appId: string, appSecret: string): Promise<Line[]> {
  if (!appId || !appSecret) return [{ label: "Token expiry", value: "add App ID + App Secret (advanced) to check", tone: "amber" }];
  const r = await fetchJson(`${GRAPH}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`);
  const d = (r.json.data ?? {}) as Json;
  if (!r.ok || !d) return [{ label: "Token check", value: metaErr(r.json), tone: "amber" }];
  const lines: Line[] = [];
  const exp = Number(d.expires_at ?? 0);
  lines.push({ label: "Token expires", value: exp === 0 ? "never" : new Date(exp * 1000).toLocaleDateString(), tone: exp === 0 || exp * 1000 - Date.now() > 14 * 86400000 ? "green" : "amber" });
  const scopes = ((d.scopes as string[] | undefined) ?? []);
  const need = ["pages_manage_posts", "instagram_content_publish"].filter((s) => !scopes.includes(s));
  lines.push({ label: "Permissions", value: need.length ? `missing ${need.join(", ")}` : "posting permissions granted", tone: need.length ? "amber" : "green" });
  return lines;
}

/** Live check of one platform with the credentials currently in effect (CRM-saved, else .env). */
export async function testSocialConnection(platform: SocialPlatform, token?: string): Promise<SocialTest> {
  const fail = (error: string, lines: Line[] = []): SocialTest => ({ ok: false, lines, error, testedAt: Date.now() });
  if (!(await guard(token))) return fail(DENIED);
  if (!rateLimit("social-setup", 40, 60_000).allowed) return fail("Too many checks — wait a minute and try again.");
  const env = await socialEnv();
  const conn = platformConnection(platform, env);
  if (!conn.connected) return fail(`Not configured yet — missing ${conn.missing.join(", ")}.`);

  try {
    if (platform === "facebook") {
      const r = await fetchJson(`${GRAPH}/${env.META_PAGE_ID}?fields=name,link,fan_count`, { headers: { Authorization: `Bearer ${env.META_PAGE_ACCESS_TOKEN}` } });
      if (!r.ok) return fail(`Meta rejected the Page credentials: ${metaErr(r.json)}`);
      const lines: Line[] = [
        { label: "Page", value: String(r.json.name ?? "—"), tone: "green" },
        { label: "Followers", value: String(r.json.fan_count ?? "—") },
        ...(await metaTokenLines(env.META_PAGE_ACCESS_TOKEN!, env.META_APP_ID ?? "", env.META_APP_SECRET ?? "")),
      ];
      return { ok: true, lines, testedAt: Date.now() };
    }
    if (platform === "instagram") {
      const r = await fetchJson(`${GRAPH}/${env.META_INSTAGRAM_USER_ID}?fields=username,followers_count,media_count`, { headers: { Authorization: `Bearer ${env.META_PAGE_ACCESS_TOKEN}` } });
      if (!r.ok) return fail(`Meta rejected the Instagram credentials: ${metaErr(r.json)}`);
      return { ok: true, testedAt: Date.now(), lines: [
        { label: "Account", value: `@${String(r.json.username ?? "—")}`, tone: "green" },
        { label: "Followers", value: String(r.json.followers_count ?? "—") },
        { label: "Posts", value: String(r.json.media_count ?? "—") },
      ] };
    }
    if (platform === "twitter") {
      const url = "https://api.twitter.com/2/users/me";
      const auth = buildTwitterOAuthHeader("GET", url, env);
      if (!auth) return fail("Missing X credentials.");
      const r = await fetchJson(url, { headers: { Authorization: auth } });
      if (r.status === 401) return fail("X rejected the keys (401) — regenerate the Access Token & Secret after enabling Read and Write.");
      if (r.status === 403) return fail("X says this app isn't allowed (403) — set app permissions to Read and Write, then regenerate the Access Token & Secret.");
      if (r.status === 429) return { ok: true, testedAt: Date.now(), lines: [{ label: "Keys", value: "accepted (rate limited right now — try again later)", tone: "amber" }] };
      if (!r.ok) return fail(`X returned ${r.status}.`);
      const u = (r.json.data ?? {}) as Json;
      return { ok: true, testedAt: Date.now(), lines: [{ label: "Account", value: `@${String(u.username ?? "—")}`, tone: "green" }, { label: "Name", value: String(u.name ?? "—") }] };
    }
    // LinkedIn — read back one post of the organisation. 401/426 are definitive; 403 means the token is valid
    // but has no read scope, so it cannot be fully verified without posting.
    const version = env.LINKEDIN_API_VERSION || DEFAULT_LINKEDIN_API_VERSION;
    const r = await fetchJson(`https://api.linkedin.com/rest/posts?author=${encodeURIComponent(env.LINKEDIN_ORGANIZATION_URN!)}&q=author&count=1`, {
      headers: { Authorization: `Bearer ${env.LINKEDIN_ACCESS_TOKEN}`, "LinkedIn-Version": version, "X-Restli-Protocol-Version": "2.0.0" },
    });
    const vline: Line = { label: "API version", value: version };
    if (r.status === 401) return fail("LinkedIn says the token is invalid or expired (401) — LinkedIn tokens last about 60 days; create a new one.", [vline]);
    if (r.status === 426 || (r.status === 400 && /version/i.test(JSON.stringify(r.json)))) return fail(`LinkedIn no longer supports API version ${version}. Enter a newer one (YYYYMM, e.g. ${DEFAULT_LINKEDIN_API_VERSION}) under Advanced.`, [vline]);
    if (r.status === 403) return { ok: true, testedAt: Date.now(), lines: [vline, { label: "Token", value: "accepted — but it can't read posts, so posting can only be confirmed by publishing", tone: "amber" }] };
    if (!r.ok) return fail(`LinkedIn returned ${r.status}.`, [vline]);
    return { ok: true, testedAt: Date.now(), lines: [vline, { label: "Organisation", value: env.LINKEDIN_ORGANIZATION_URN!, tone: "green" }, { label: "Token", value: "valid", tone: "green" }] };
  } catch (err) {
    console.error(`[social-setup] ${platform} test failed:`, err instanceof Error ? err.message : err);
    return fail("Could not reach the platform (network error or timeout).");
  }
}

// ── Meta: find the Pages a Facebook user token can manage ────────────────────
async function exchangeLongLived(userToken: string, appId: string, appSecret: string): Promise<string> {
  if (!appId || !appSecret) return userToken;
  const r = await fetchJson(`${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(userToken)}`);
  return r.ok && typeof r.json.access_token === "string" ? r.json.access_token : userToken;
}
interface MetaPage { id: string; name: string; access_token?: string; instagram_business_account?: { id: string; username?: string } }
async function listPages(userToken: string): Promise<{ ok: true; pages: MetaPage[] } | { ok: false; error: string }> {
  const r = await fetchJson(`${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=50`, { headers: { Authorization: `Bearer ${userToken}` } });
  if (!r.ok) return { ok: false, error: `Meta rejected the token: ${metaErr(r.json)}` };
  return { ok: true, pages: ((r.json.data as MetaPage[] | undefined) ?? []) };
}

/** Step 1 — list Pages (id, name, linked Instagram). The Page tokens themselves stay on the server. */
export async function discoverMetaPages(userToken: string, token?: string): Promise<{ ok: boolean; pages: { id: string; name: string; igId?: string; igUsername?: string }[]; error?: string }> {
  if (!(await guard(token))) return { ok: false, pages: [], error: DENIED };
  if (!rateLimit("social-setup", 40, 60_000).allowed) return { ok: false, pages: [], error: "Too many requests — wait a minute." };
  const ut = String(userToken ?? "").trim();
  if (ut.length < 20 || ut.length > 2000) return { ok: false, pages: [], error: "Paste the Facebook user access token (from Graph API Explorer)." };
  try {
    const r = await listPages(ut);
    if (!r.ok) return { ok: false, pages: [], error: r.error };
    if (!r.pages.length) return { ok: false, pages: [], error: "This token can't manage any Pages. Grant pages_show_list and pages_manage_posts and choose your Page when Facebook asks." };
    return { ok: true, pages: r.pages.map((p) => ({ id: p.id, name: p.name, igId: p.instagram_business_account?.id, igUsername: p.instagram_business_account?.username })) };
  } catch { return { ok: false, pages: [], error: "Could not reach Meta." }; }
}

/** Step 2 — save the chosen Page (and its linked Instagram). If App ID + Secret are given the user token is first
 *  exchanged for a long-lived one, which makes the Page token non-expiring. */
export async function connectMetaPage(input: { userToken: string; pageId: string; appId?: string; appSecret?: string }, token?: string): Promise<{ ok: boolean; name?: string; instagram?: string; error?: string }> {
  if (!(await guard(token))) return { ok: false, error: DENIED };
  if (!rateLimit("social-setup", 40, 60_000).allowed) return { ok: false, error: "Too many requests — wait a minute." };
  const pageId = String(input.pageId ?? "").replace(/\D/g, "");
  const ut = String(input.userToken ?? "").trim();
  if (!pageId || ut.length < 20 || ut.length > 2000) return { ok: false, error: "Missing Page or token." };
  try {
    const saved = await loadSocialConfig(true);
    const appId = (input.appId ?? "").trim() || saved.meta.appId;
    const appSecret = (input.appSecret ?? "").trim().startsWith("••••") ? saved.meta.appSecret : ((input.appSecret ?? "").trim() || saved.meta.appSecret);
    const longLived = await exchangeLongLived(ut, appId, appSecret);
    const r = await listPages(longLived);
    if (!r.ok) return { ok: false, error: r.error };
    const page = r.pages.find((p) => p.id === pageId);
    if (!page?.access_token) return { ok: false, error: "That Page wasn't returned for this token." };
    const res = await saveSocialConfig({ meta: {
      pageId, pageToken: page.access_token, igUserId: page.instagram_business_account?.id ?? "", appId, appSecret,
    } });
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, name: page.name, instagram: page.instagram_business_account?.username };
  } catch { return { ok: false, error: "Could not reach Meta." }; }
}
