"use client";
// Social Media ▸ Connect Accounts (advanced mode).
// Paste tokens here instead of editing .env on the server: they are encrypted in the database, override .env,
// and every platform can be checked live ("Test connection"). Advanced mode adds the Meta Page finder, token
// expiry/permission check, App ID/Secret and the LinkedIn API version.

import { useCallback, useEffect, useState } from "react";
import { Check, X, Plug, ShieldCheck, ShieldAlert, Search, Unplug, ChevronDown, ChevronUp } from "lucide-react";
import {
  getSocialSetup, saveSocialSetup, disconnectSocial, testSocialConnection, discoverMetaPages, connectMetaPage,
  type SocialSetup, type SocialTest,
} from "@/lib/actions/socialSetup";
import type { SocialConfig, SocialGroup } from "@/lib/social/config";
import { PLATFORM_LABEL } from "@/lib/social/validate";
import { getAccessToken } from "@/lib/security/clientSession";
import { GOLD, EMERALD, RED, CARD, PlatformIcon, type PlatformKey } from "./shared";

const inputCls = "w-full rounded-lg border bg-transparent px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-[#D4AF37]/60";
const inputStyle = { borderColor: "rgba(128,128,128,0.25)" } as const;

interface FieldDef { group: SocialGroup; key: string; label: string; secret?: boolean; placeholder?: string; hint?: string; advanced?: boolean }
const FIELDS: Record<SocialGroup, FieldDef[]> = {
  meta: [
    { group: "meta", key: "pageId", label: "Facebook Page ID", placeholder: "e.g. 104512345678901" },
    { group: "meta", key: "pageToken", label: "Page access token", secret: true, placeholder: "EAAG…", hint: "A long-lived Page token never expires. Use “Find my Pages” below to get it without copy-paste." },
    { group: "meta", key: "igUserId", label: "Instagram Business account ID (optional)", placeholder: "e.g. 17841400000000000", hint: "Needed only for Instagram. “Find my Pages” fills it in." },
    { group: "meta", key: "appId", label: "Meta App ID", advanced: true, placeholder: "optional — enables the token-expiry check" },
    { group: "meta", key: "appSecret", label: "Meta App Secret", secret: true, advanced: true },
  ],
  linkedin: [
    { group: "linkedin", key: "token", label: "Access token", secret: true, hint: "LinkedIn tokens last about 60 days — create a new one before it expires." },
    { group: "linkedin", key: "orgUrn", label: "Organization URN or page number", placeholder: "urn:li:organization:12345678 (or just 12345678)" },
    { group: "linkedin", key: "apiVersion", label: "API version (YYYYMM)", advanced: true, placeholder: "leave empty for the default" },
  ],
  twitter: [
    { group: "twitter", key: "apiKey", label: "API key", secret: true },
    { group: "twitter", key: "apiSecret", label: "API secret", secret: true },
    { group: "twitter", key: "accessToken", label: "Access token", secret: true, hint: "Enable Read and Write on the app first, then generate the token." },
    { group: "twitter", key: "accessSecret", label: "Access token secret", secret: true },
  ],
};

const GUIDE: Record<SocialGroup, string[]> = {
  meta: [
    "developers.facebook.com → Create App (Business).",
    "Graph API Explorer: pick your app, add pages_show_list, pages_manage_posts, instagram_basic, instagram_content_publish, generate the user token.",
    "Paste that user token into “Find my Pages” below — it lists your Pages and saves the right Page token.",
  ],
  linkedin: [
    "developers.linkedin.com → create an app and link your Company Page.",
    "Request the Community Management API (w_organization_social); generate the access token.",
    "Enter your page number (the digits in your page admin URL).",
  ],
  twitter: [
    "developer.x.com → your app → User authentication settings → Read and Write.",
    "Keys and tokens → generate API key & secret, then Access token & secret (after the permission change).",
    "Paste all four values.",
  ],
};

const TITLES: Record<SocialGroup, { title: string; platforms: PlatformKey[] }> = {
  meta: { title: "Facebook & Instagram (Meta)", platforms: ["facebook", "instagram"] },
  linkedin: { title: "LinkedIn", platforms: ["linkedin"] },
  twitter: { title: "X (Twitter)", platforms: ["twitter"] },
};
const GROUPS: SocialGroup[] = ["meta", "linkedin", "twitter"];
const toneCls = { green: "text-emerald-400", amber: "text-amber-400", red: "text-rose-400" } as const;

export default function ConnectAccountsTab({ onChanged }: { onChanged: () => void }) {
  const [setup, setSetup] = useState<SocialSetup | null>(null);
  const [denied, setDenied] = useState(false);
  const [edit, setEdit] = useState<SocialConfig | null>(null);
  const [advanced, setAdvanced] = useState(true);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<Partial<Record<SocialGroup, { ok: boolean; text: string }>>>({});
  const [tests, setTests] = useState<Partial<Record<PlatformKey, SocialTest>>>({});
  const [guideOpen, setGuideOpen] = useState<SocialGroup | null>(null);
  const [userToken, setUserToken] = useState("");
  const [pages, setPages] = useState<{ id: string; name: string; igId?: string; igUsername?: string }[]>([]);

  const load = useCallback(() => {
    getSocialSetup(getAccessToken()).then((s) => { if (s) { setSetup(s); setDenied(false); } else setDenied(true); }).catch(() => setDenied(true));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (denied) return <div className="rounded-xl border p-5 text-xs text-slate-400" style={CARD}>Sign in with an admin account to manage social connections.</div>;
  if (!setup) return <p className="text-xs text-slate-500">Loading…</p>;
  const cfg = edit ?? setup.config;
  const dirty = edit !== null;

  const setField = (g: SocialGroup, k: string, v: string) => {
    const next = JSON.parse(JSON.stringify(cfg)) as SocialConfig;
    (next[g] as unknown as Record<string, string>)[k] = v;
    setEdit(next);
  };
  const say = (g: SocialGroup, ok: boolean, text: string) => setMsg((m) => ({ ...m, [g]: { ok, text } }));
  const refresh = () => { load(); onChanged(); };

  const save = async (g: SocialGroup) => {
    setBusy(`save-${g}`); say(g, true, "");
    try {
      const r = await saveSocialSetup({ [g]: cfg[g] } as Partial<SocialConfig>, getAccessToken());
      if (r.ok) { setEdit(null); say(g, true, "Saved and encrypted. It is used for every post from now on — press Test connection to verify."); refresh(); }
      else say(g, false, r.error ?? "Could not save.");
    } catch { say(g, false, "Could not reach the server."); }
    finally { setBusy(""); }
  };

  const test = async (p: PlatformKey, g: SocialGroup) => {
    setBusy(`test-${p}`);
    try { setTests((t) => ({ ...t, [p]: undefined })); const r = await testSocialConnection(p, getAccessToken()); setTests((t) => ({ ...t, [p]: r })); refresh(); }
    catch { say(g, false, "Could not reach the server."); }
    finally { setBusy(""); }
  };

  const disconnect = async (g: SocialGroup) => {
    if (!confirm(`Remove the saved ${TITLES[g].title} credentials from the CRM? ${setup.source[g] === "crm" ? "Anything set in .env on the server will be used instead." : ""}`)) return;
    setBusy(`dc-${g}`);
    try {
      const r = await disconnectSocial(g, getAccessToken());
      if (r.ok) { setEdit(null); setTests((t) => { const n = { ...t }; for (const p of TITLES[g].platforms) delete n[p]; return n; }); say(g, true, "Disconnected."); refresh(); }
      else say(g, false, r.error ?? "Could not disconnect.");
    } finally { setBusy(""); }
  };

  const find = async () => {
    setBusy("find"); say("meta", true, ""); setPages([]);
    try {
      const r = await discoverMetaPages(userToken, getAccessToken());
      if (r.ok) setPages(r.pages); else say("meta", false, r.error ?? "Could not find Pages.");
    } catch { say("meta", false, "Could not reach the server."); }
    finally { setBusy(""); }
  };
  const connectPage = async (pageId: string) => {
    setBusy(`page-${pageId}`);
    try {
      const r = await connectMetaPage({ userToken, pageId, appId: cfg.meta.appId, appSecret: cfg.meta.appSecret }, getAccessToken());
      if (r.ok) {
        setUserToken(""); setPages([]); setEdit(null);
        say("meta", true, `Connected ${r.name}${r.instagram ? ` and Instagram @${r.instagram}` : " (no Instagram account linked to this Page)"}. Press Test connection to verify.`);
        refresh();
      } else say("meta", false, r.error ?? "Could not connect.");
    } catch { say("meta", false, "Could not reach the server."); }
    finally { setBusy(""); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4" style={CARD}>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Plug size={15} style={{ color: GOLD }} /> Connect your social accounts</p>
          <p className="mt-0.5 text-xs text-slate-500">Paste tokens here — no server file editing. Values saved here override the server&apos;s <code>.env</code>.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px]" style={{ color: setup.encryption ? EMERALD : RED }}>
            {setup.encryption ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
            {setup.encryption ? "Tokens encrypted at rest" : "No encryption key — saving blocked"}
          </span>
          <button onClick={() => setAdvanced((a) => !a)} role="switch" aria-checked={advanced}
            className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]" style={{ borderColor: advanced ? `${GOLD}77` : "rgba(128,128,128,0.3)", color: advanced ? GOLD : "#94a3b8" }}>
            <span className="relative h-3 w-6 rounded-full" style={{ background: advanced ? `${GOLD}99` : "#475569" }}>
              <span className="absolute top-0.5 h-2 w-2 rounded-full bg-white transition-all" style={{ left: advanced ? 14 : 2 }} />
            </span>
            Advanced mode
          </button>
        </div>
      </div>
      {!setup.encryption && (
        <p className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "#EF444466", background: "#EF444412", color: "#F87171" }}>
          Set <code>AUTH_JWT_SECRET</code> (or <code>SOCIAL_CONFIG_KEY</code>) on the server so tokens can be encrypted before they are stored. Until then nothing can be saved here.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {GROUPS.map((g) => {
          const src = setup.source[g];
          const fields = FIELDS[g].filter((f) => advanced || !f.advanced);
          const m = msg[g];
          return (
            <section key={g} className={`space-y-4 rounded-xl border p-5 ${g === "meta" ? "xl:col-span-2" : ""}`} style={CARD}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {TITLES[g].platforms.map((p) => <PlatformIcon key={p} platform={p} size={14} />)}
                  <p className="text-sm font-semibold text-slate-200">{TITLES[g].title}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {TITLES[g].platforms.map((p) => (
                    <span key={p} className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: setup.connected[p] ? "rgba(0,168,107,0.15)" : "rgba(128,128,128,0.15)", color: setup.connected[p] ? EMERALD : "#94a3b8" }}>
                      {PLATFORM_LABEL[p]}: {setup.connected[p] ? "ready" : "not set"}
                    </span>
                  ))}
                  <span className="rounded-full border px-2 py-0.5 text-[10px]" style={{ borderColor: "rgba(128,128,128,0.3)", color: "#94a3b8" }}>
                    source: {src === "crm" ? "saved in CRM" : src === "env" ? ".env (server)" : "none"}
                  </span>
                </div>
              </div>

              <button onClick={() => setGuideOpen(guideOpen === g ? null : g)} className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: GOLD }}>
                {guideOpen === g ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Where do I get these?
              </button>
              {guideOpen === g && (
                <ol className="list-decimal space-y-1 rounded-lg border p-3 pl-7 text-xs text-slate-400" style={{ borderColor: "rgba(128,128,128,0.2)" }}>
                  {GUIDE[g].map((st) => <li key={st}>{st}</li>)}
                </ol>
              )}

              {g === "meta" && advanced && (
                <div className="space-y-3 rounded-lg border p-3" style={{ borderColor: `${GOLD}44`, background: `${GOLD}08` }}>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-200"><Search size={12} style={{ color: GOLD }} /> Find my Pages (recommended)</p>
                  <p className="text-[11px] text-slate-500">Paste a Facebook user token from Graph API Explorer. The CRM lists the Pages you manage; pick one and it saves the Page ID, a non-expiring Page token and the linked Instagram account. The user token is not stored.</p>
                  <div className="flex gap-2">
                    <input type="password" autoComplete="off" value={userToken} onChange={(e) => setUserToken(e.target.value)} placeholder="Facebook user access token (EAAG…)" className={inputCls} style={inputStyle} />
                    <button onClick={() => void find()} disabled={busy === "find" || userToken.trim().length < 20}
                      className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-black disabled:opacity-50" style={{ background: GOLD }}>
                      {busy === "find" ? "Searching…" : "Find my Pages"}
                    </button>
                  </div>
                  {pages.length > 0 && (
                    <div className="space-y-2">
                      {pages.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5" style={{ borderColor: "rgba(128,128,128,0.25)" }}>
                          <div className="min-w-0 text-xs">
                            <p className="font-semibold text-slate-200">{p.name}</p>
                            <p className="text-[10px] text-slate-500">Page {p.id} · {p.igUsername ? `Instagram @${p.igUsername}` : "no Instagram linked"}</p>
                          </div>
                          <button onClick={() => void connectPage(p.id)} disabled={busy === `page-${p.id}`}
                            className="shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50" style={{ borderColor: `${GOLD}77`, color: GOLD }}>
                            {busy === `page-${p.id}` ? "Connecting…" : "Connect this Page"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className={`grid gap-3 ${g === "twitter" || g === "meta" ? "md:grid-cols-2" : ""}`}>
                {fields.map((f) => {
                  const val = (cfg[g] as unknown as Record<string, string>)[f.key] ?? "";
                  const inEnv = setup.envHints[g][f.key];
                  return (
                    <label key={f.key} className="block">
                      <span className="mb-1 block text-[11px] text-slate-500">{f.label}</span>
                      <input
                        type={f.secret ? "password" : "text"} autoComplete="off" value={val} className={inputCls} style={inputStyle}
                        onChange={(e) => setField(g, f.key, e.target.value)}
                        placeholder={val ? undefined : inEnv ? "using the server (.env) value — leave empty to keep it" : f.placeholder}
                      />
                      {f.key === "apiVersion" && <span className="mt-0.5 block text-[10px] text-slate-600">Default: {setup.defaultLinkedinVersion}. Change only if LinkedIn says your version is no longer supported.</span>}
                      {f.hint && <span className="mt-0.5 block text-[10px] text-slate-600">{f.hint}</span>}
                    </label>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => void save(g)} disabled={busy === `save-${g}` || !dirty || !setup.encryption}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-black disabled:opacity-40" style={{ background: GOLD }}>
                  {busy === `save-${g}` ? "Saving…" : dirty ? "Save" : "Saved"}
                </button>
                {TITLES[g].platforms.map((p) => (
                  <button key={p} onClick={() => void test(p, g)} disabled={busy === `test-${p}`}
                    className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50" style={{ borderColor: "rgba(128,128,128,0.35)", color: "#cbd5e1" }}>
                    {busy === `test-${p}` ? "Checking…" : `Test ${PLATFORM_LABEL[p]}`}
                  </button>
                ))}
                {advanced && src === "crm" && (
                  <button onClick={() => void disconnect(g)} disabled={busy === `dc-${g}`}
                    className="ml-auto flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold text-red-400 disabled:opacity-50" style={{ borderColor: "rgba(239,68,68,0.4)" }}>
                    <Unplug size={12} /> Disconnect
                  </button>
                )}
              </div>
              {m?.text && <p className="text-xs" role="status" style={{ color: m.ok ? EMERALD : "#F87171" }}>{m.ok ? "✓ " : "✗ "}{m.text}</p>}

              {TITLES[g].platforms.map((p) => {
                const t = tests[p];
                if (!t) return null;
                return (
                  <div key={p} className="rounded-lg border p-3" style={{ borderColor: t.ok ? `${EMERALD}55` : "rgba(239,68,68,0.45)", background: t.ok ? "rgba(0,168,107,0.05)" : "rgba(239,68,68,0.05)" }}>
                    <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: t.ok ? EMERALD : "#F87171" }}>
                      {t.ok ? <Check size={13} /> : <X size={13} />} {PLATFORM_LABEL[p]}: {t.ok ? "connected" : "problem"}
                      <span className="ml-auto text-[10px] font-normal text-slate-500">{new Date(t.testedAt).toLocaleTimeString()}</span>
                    </p>
                    {t.error && <p className="mt-1 text-xs text-rose-400">{t.error}</p>}
                    {t.lines.map((l) => (
                      <div key={l.label} className="mt-1 flex justify-between gap-3 border-b py-1 text-[11px]" style={{ borderColor: "rgba(128,128,128,0.15)" }}>
                        <span className="text-slate-500">{l.label}</span>
                        <span className={l.tone ? toneCls[l.tone] : "text-slate-200"}>{l.value}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>

      <div className="rounded-xl border p-4 text-xs text-slate-500" style={CARD}>
        <p className="mb-1 font-semibold text-slate-300">Scheduled posts</p>
        <p>Posts you schedule are sent by the server&apos;s scheduler (<code>/api/social/cron</code>, every few minutes — see <code>docs/SOCIAL_SETUP.md</code>). Immediate “Post Now” works as soon as an account shows <b className="text-slate-300">ready</b>.</p>
      </div>
    </div>
  );
}
