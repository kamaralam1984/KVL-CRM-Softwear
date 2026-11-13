"use client";
// Social Media Scheduler — every number, post and status on this page comes from the database
// (social_posts) or the server's real credentials. Posting never claims success unless the
// platform accepted the post.

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2, CheckSquare, Square, Image as ImageIcon, Video, Type, Film, BookOpen,
  Calendar, Clock, Sparkles, Send, Zap, ChevronLeft, ChevronRight, BarChart2,
  Copy, Check, LayoutDashboard, AlertTriangle, RefreshCw, Trash2, Info, Layers,
} from "lucide-react";
import {
  getSocialPosts, getSocialConnections, schedulePost, postSocialNow, retrySocialPost, cancelSocialPost,
  type SocialPost,
} from "@/lib/actions/socialPosts";
import { generateSocialContent, type SocialVariation } from "@/lib/actions/socialAI";
import { getAccessToken } from "@/lib/security/clientSession";
import { PLATFORM_LABEL, PLATFORM_LIMITS, validatePost, type SocialPlatform } from "@/lib/social/validate";
import type { PlatformConnection } from "@/lib/social/connections";

// ── Palette / platform look ─────────────────────────────────────────────────
const GOLD    = "#D4AF37";
const EMERALD = "#00A86B";
const RED     = "#EF4444";
const BG      = "var(--bg, #080c14)";
const CARD    = { background: "rgba(128,128,128,0.06)", borderColor: "rgba(128,128,128,0.18)" } as const;

type PlatformKey = SocialPlatform;
const PLATFORMS: PlatformKey[] = ["facebook", "instagram", "linkedin", "twitter"];
const PLATFORM_COLOR: Record<PlatformKey, string> = { facebook: "#1877F2", instagram: "#E1306C", linkedin: "#0A66C2", twitter: "#1DA1F2" };
const PLATFORM_GLYPH: Record<PlatformKey, string> = { facebook: "f", instagram: "Ig", linkedin: "in", twitter: "X" };

// lucide v1 has no brand icons, so each platform gets a coloured badge with its own mark.
function PlatformIcon({ platform, size = 14 }: { platform: PlatformKey; size?: number }) {
  const c = PLATFORM_COLOR[platform];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md font-black leading-none"
      style={{ width: size + 8, height: size + 8, background: c, color: "#fff", fontSize: Math.max(8, size - 3) }}
      aria-label={PLATFORM_LABEL[platform]}
    >
      {PLATFORM_GLYPH[platform]}
    </span>
  );
}

type Conns = Record<PlatformKey, PlatformConnection>;
interface Data { posts: SocialPost[]; conns: Conns | null; loaded: boolean; refresh: () => void }

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—");
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const postDate = (p: SocialPost) => p.scheduled_at ?? p.published_at ?? p.created_at;

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, { bg: string; color: string; label: string }> = {
    scheduled: { bg: "rgba(0,168,107,0.15)", color: EMERALD, label: "Scheduled" },
    published: { bg: "rgba(59,130,246,0.15)", color: "#60A5FA", label: "Published" },
    failed:    { bg: "rgba(239,68,68,0.15)", color: RED, label: "Failed" },
    draft:     { bg: "rgba(212,175,55,0.15)", color: GOLD, label: "Draft" },
  };
  const c = m[status] ?? m.draft;
  return <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: c.bg, color: c.color }}>{c.label}</span>;
}

function Empty({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <span className="text-slate-600">{icon}</span>
      <p className="text-sm font-semibold text-slate-300">{title}</p>
      <p className="max-w-sm text-xs text-slate-500">{hint}</p>
    </div>
  );
}

// ── One post row (dashboard / calendar) with Cancel / Retry ──────────────────
function PostRow({ post, onChanged }: { post: SocialPost; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(true); setErr("");
    try { const r = await fn(); if (!r.ok) setErr(r.error ?? "Failed."); onChanged(); }
    catch { setErr("Could not reach the server."); }
    finally { setBusy(false); }
  };
  return (
    <div className="rounded-lg border p-3" style={CARD}>
      <div className="flex items-start gap-3">
        <PlatformIcon platform={post.platform} size={15} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs text-slate-300">{post.content}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
            <Clock size={10} /> {post.status === "published" ? `Published ${fmt(post.published_at)}` : post.scheduled_at ? fmt(post.scheduled_at) : "Not scheduled"}
            {post.media_urls?.[0] && <span className="inline-flex items-center gap-0.5"><ImageIcon size={10} /> image</span>}
          </p>
        </div>
        <StatusBadge status={post.status} />
      </div>
      {(post.status !== "published") && (
        <div className="mt-2 flex items-center justify-end gap-2">
          {(post.status === "failed" || post.status === "draft") && (
            <button disabled={busy} onClick={() => run(() => retrySocialPost(post.id, getAccessToken()))}
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold disabled:opacity-50" style={{ borderColor: `${GOLD}55`, color: GOLD }}>
              <RefreshCw size={10} className={busy ? "animate-spin" : ""} /> {post.status === "failed" ? "Retry" : "Post now"}
            </button>
          )}
          <button disabled={busy} onClick={() => { if (confirm("Remove this post? It will not be published.")) void run(() => cancelSocialPost(post.id, getAccessToken())); }}
            className="flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold text-red-400 disabled:opacity-50" style={{ borderColor: "rgba(239,68,68,0.35)" }}>
            <Trash2 size={10} /> {post.status === "scheduled" ? "Cancel" : "Remove"}
          </button>
        </div>
      )}
      {err && <p className="mt-2 text-[11px] text-red-400">{err}</p>}
    </div>
  );
}

// ── TAB: Dashboard ───────────────────────────────────────────────────────────
function DashboardTab({ data }: { data: Data }) {
  const { posts, conns, loaded, refresh } = data;
  const [weekAgo] = useState(() => Date.now() - 7 * 86400000);
  const upcoming = posts.filter((p) => p.status === "scheduled" || p.status === "draft")
    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""));
  const recent = posts.filter((p) => p.status === "published" || p.status === "failed")
    .sort((a, b) => (b.published_at ?? b.created_at).localeCompare(a.published_at ?? a.created_at)).slice(0, 8);

  const stats = [
    { label: "Scheduled", value: posts.filter((p) => p.status === "scheduled").length, sub: "waiting to go out", icon: Calendar, color: EMERALD },
    { label: "Published (7 days)", value: posts.filter((p) => p.status === "published" && new Date(p.published_at ?? 0).getTime() >= weekAgo).length, sub: "last 7 days", icon: Send, color: "#60A5FA" },
    { label: "Failed", value: posts.filter((p) => p.status === "failed").length, sub: "need a retry", icon: AlertTriangle, color: RED },
    { label: "All posts", value: posts.length, sub: "in your planner", icon: Layers, color: GOLD },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-5" style={CARD}>
        <p className="mb-4 text-sm font-semibold text-slate-200">Connected Accounts</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORMS.map((k) => {
            const c = conns?.[k];
            return (
              <div key={k} className="rounded-lg border p-3" style={{ borderColor: c?.connected ? `${EMERALD}55` : "rgba(128,128,128,0.2)", background: c?.connected ? "rgba(0,168,107,0.06)" : "transparent" }}>
                <div className="flex items-center gap-2">
                  <PlatformIcon platform={k} size={14} />
                  <span className="text-xs font-semibold text-slate-200">{PLATFORM_LABEL[k]}</span>
                </div>
                <p className="mt-2 text-[11px] font-semibold" style={{ color: c?.connected ? EMERALD : "#94a3b8" }}>
                  {!conns ? "Checking…" : c?.connected ? "● Connected" : "○ Not connected"}
                </p>
                {conns && !c?.connected && c?.missing.length ? (
                  <p className="mt-1 break-words text-[10px] leading-snug text-slate-500">Add {c.missing.join(", ")} to the server settings to connect.</p>
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-slate-600">Posts can only be sent to connected accounts. Nothing is faked: an unconnected platform is blocked instead of pretending to publish.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border p-4" style={CARD}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">{label}</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${color}22` }}><Icon size={14} style={{ color }} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-100">{loaded ? value : "–"}</p>
            <p className="mt-1 text-[10px] text-slate-500">{sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-5" style={CARD}>
        <p className="mb-4 text-sm font-semibold text-slate-200">Upcoming Posts</p>
        {!loaded ? <p className="text-xs text-slate-500">Loading…</p> : upcoming.length === 0 ? (
          <Empty icon={<Calendar size={26} />} title="Nothing scheduled" hint="Open the Schedule Post tab to plan your first post." />
        ) : <div className="space-y-3">{upcoming.map((p) => <PostRow key={p.id} post={p} onChanged={refresh} />)}</div>}
      </div>

      {recent.length > 0 && (
        <div className="rounded-xl border p-5" style={CARD}>
          <p className="mb-4 text-sm font-semibold text-slate-200">Recent Activity</p>
          <div className="space-y-3">{recent.map((p) => <PostRow key={p.id} post={p} onChanged={refresh} />)}</div>
        </div>
      )}
    </div>
  );
}

// ── TAB: Schedule Post ───────────────────────────────────────────────────────
type PostType = "text" | "image" | "video" | "story" | "reel";
const POST_TYPES: { key: PostType; label: string; icon: typeof Type; supported: boolean }[] = [
  { key: "text",  label: "Text",  icon: Type,      supported: true  },
  { key: "image", label: "Image", icon: ImageIcon, supported: true  },
  { key: "video", label: "Video", icon: Video,     supported: false },
  { key: "story", label: "Story", icon: BookOpen,  supported: false },
  { key: "reel",  label: "Reel",  icon: Film,      supported: false },
];

function SchedulePostTab({ data, initialContent, initialPlatform }: { data: Data; initialContent: string; initialPlatform?: PlatformKey }) {
  const { conns, refresh } = data;
  const [selected, setSelected] = useState<Set<PlatformKey>>(new Set(initialPlatform ? [initialPlatform] : []));
  const [postType, setPostType] = useState<PostType>("text");
  const [content, setContent] = useState(initialContent);
  const [imageUrl, setImageUrl] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; lines: string[] } | null>(null);

  const toggle = (k: PlatformKey) => setSelected((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const limit = [...selected].reduce((m, k) => Math.min(m, PLATFORM_LIMITS[k]), 5000);
  const pct = Math.min((content.length / limit) * 100, 100);
  const limitColor = pct > 100 || content.length > limit ? RED : pct > 70 ? GOLD : EMERALD;

  const handleAI = async () => {
    setMsg(null);
    if (content.trim().length < 3) { setMsg({ kind: "err", lines: ["Type a topic or rough idea in the box first, then press AI Content."] }); return; }
    setAiBusy(true);
    try {
      const r = await generateSocialContent({ topic: content, tone: "Professional", platform: [...selected][0] ?? "linkedin" }, getAccessToken());
      if (r.ok) { setContent(r.variations[0].content); if (!r.usedAi) setMsg({ kind: "ok", lines: ["Template used — add ANTHROPIC_API_KEY on the server for AI-written posts."] }); }
      else setMsg({ kind: "err", lines: [r.error] });
    } catch { setMsg({ kind: "err", lines: ["Could not reach the server."] }); }
    finally { setAiBusy(false); }
  };

  const submit = async (mode: "schedule" | "now") => {
    setMsg(null);
    if (selected.size === 0) { setMsg({ kind: "err", lines: ["Select at least one connected platform."] }); return; }
    const mediaUrls = postType === "image" && imageUrl.trim() ? [imageUrl.trim()] : [];
    for (const p of selected) {
      const bad = validatePost({ platform: p, postType, content, mediaUrl: mediaUrls[0] });
      if (bad) { setMsg({ kind: "err", lines: [bad] }); return; }
    }
    let scheduledAt = "";
    if (mode === "schedule") {
      if (!date || !time) { setMsg({ kind: "err", lines: ["Pick a date and a time to schedule."] }); return; }
      const when = new Date(`${date}T${time}`);
      if (isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) { setMsg({ kind: "err", lines: ["That time has already passed — pick a future date and time."] }); return; }
      scheduledAt = when.toISOString();
    } else if (!confirm(`Publish this post to ${[...selected].map((k) => PLATFORM_LABEL[k]).join(", ")} right now?`)) return;

    setBusy(true);
    try {
      const token = getAccessToken();
      const results = await Promise.all([...selected].map(async (platform) => {
        const input = { platform, postType, content, mediaUrls };
        const r = mode === "now" ? await postSocialNow(input, token) : await schedulePost({ ...input, scheduledAt }, token);
        return { platform, r };
      }));
      const lines = results.map(({ platform, r }) => r.ok
        ? `${PLATFORM_LABEL[platform]}: ${mode === "now" ? "published" : "scheduled"}`
        : `${PLATFORM_LABEL[platform]}: ${r.error ?? "failed"}`);
      const allOk = results.every(({ r }) => r.ok);
      setMsg({ kind: allOk ? "ok" : "err", lines });
      if (allOk) { setContent(""); setImageUrl(""); setDate(""); setTime(""); }
      refresh();
    } catch { setMsg({ kind: "err", lines: ["Could not reach the server — nothing was sent."] }); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-5">
        <div className="rounded-xl border p-5" style={CARD}>
          <p className="mb-3 text-sm font-semibold text-slate-200">Select Platforms</p>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map((k) => {
              const connected = conns?.[k]?.connected ?? false;
              const active = selected.has(k);
              return (
                <button key={k} onClick={() => connected && toggle(k)} disabled={!connected}
                  title={connected ? undefined : `${PLATFORM_LABEL[k]} isn't connected on the server yet`}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: active ? `${PLATFORM_COLOR[k]}18` : "transparent", borderColor: active ? `${PLATFORM_COLOR[k]}80` : "rgba(128,128,128,0.2)" }}>
                  {active ? <CheckSquare size={14} style={{ color: PLATFORM_COLOR[k] }} /> : <Square size={14} className="text-slate-500" />}
                  <PlatformIcon platform={k} size={12} />
                  <span className="min-w-0 text-xs text-slate-200">
                    {PLATFORM_LABEL[k]}
                    {conns && !connected && <span className="block text-[9px] text-slate-500">Not connected</span>}
                  </span>
                </button>
              );
            })}
          </div>
          {conns && PLATFORMS.every((k) => !conns[k].connected) && (
            <p className="mt-3 flex gap-1.5 text-[11px] text-amber-500"><Info size={12} className="mt-0.5 shrink-0" /> No platform is connected yet. Open the Dashboard tab to see exactly what to add.</p>
          )}
        </div>

        <div className="rounded-xl border p-5" style={CARD}>
          <p className="mb-3 text-sm font-semibold text-slate-200">Post Type</p>
          <div className="flex flex-wrap gap-2">
            {POST_TYPES.map(({ key, label, icon: Icon, supported }) => (
              <button key={key} onClick={() => supported && setPostType(key)} disabled={!supported}
                title={supported ? undefined : "Needs media upload — not supported yet"}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: postType === key ? "rgba(212,175,55,0.12)" : "transparent", borderColor: postType === key ? `${GOLD}80` : "rgba(128,128,128,0.2)", color: postType === key ? GOLD : "#94a3b8" }}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-600">Video, Story and Reel need a media upload pipeline and aren&apos;t available yet.</p>
        </div>

        {postType === "image" && (
          <div className="rounded-xl border p-5" style={CARD}>
            <p className="mb-1 text-sm font-semibold text-slate-200">Image link</p>
            <p className="mb-3 text-[11px] text-slate-500">Paste a public https link to the image (Instagram and Facebook fetch it from there).</p>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://your-site.com/photo.jpg"
              className="w-full rounded-lg border bg-transparent p-2.5 text-xs text-slate-300 outline-none focus:border-[#D4AF37]/60" style={{ borderColor: "rgba(128,128,128,0.25)" }} />
            {/^https:\/\//i.test(imageUrl.trim()) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl.trim()} alt="Preview" className="mt-3 max-h-40 rounded-lg border object-contain" style={{ borderColor: "rgba(128,128,128,0.25)" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
            )}
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border p-5" style={CARD}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-200">Content</p>
            <button onClick={handleAI} disabled={aiBusy}
              title="Type a topic or rough idea below, then press this to write the post"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:scale-105 disabled:opacity-60"
              style={{ background: "rgba(212,175,55,0.12)", color: GOLD, border: `1px solid ${GOLD}40` }}>
              <Sparkles size={12} className={aiBusy ? "animate-spin" : ""} /> {aiBusy ? "Writing…" : "AI Content"}
            </button>
          </div>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="Write your post, or type a topic and press AI Content…"
            className="w-full resize-none rounded-lg border bg-transparent p-3 text-xs text-slate-300 outline-none placeholder:text-slate-600 focus:border-[#D4AF37]/50" style={{ borderColor: "rgba(128,128,128,0.25)" }} />
          <div className="mt-2 flex items-center justify-between">
            <div className="mr-3 h-1 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: limitColor }} /></div>
            <span className="text-[10px]" style={{ color: limitColor }}>{content.length} / {selected.size ? limit : "—"}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {[...selected].map((k) => (
              <span key={k} className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: `${PLATFORM_COLOR[k]}22`, color: PLATFORM_COLOR[k] }}>
                {PLATFORM_LABEL[k]}: {PLATFORM_LIMITS[k].toLocaleString()} chars
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-5" style={CARD}>
          <p className="mb-3 text-sm font-semibold text-slate-200">Schedule <span className="font-normal text-slate-500">(only for “Schedule Post”)</span></p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] text-slate-500">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border bg-transparent px-2 py-2 text-xs text-slate-300 outline-none" style={{ borderColor: "rgba(128,128,128,0.25)" }} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-slate-500">Time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-lg border bg-transparent px-2 py-2 text-xs text-slate-300 outline-none" style={{ borderColor: "rgba(128,128,128,0.25)" }} />
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-600">Uses your computer&apos;s time zone. Scheduled posts are sent by the server&apos;s scheduler within a few minutes of the chosen time.</p>
        </div>

        <div className="flex gap-3">
          <button onClick={() => void submit("schedule")} disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
            <Calendar size={15} /> {busy ? "Working…" : "Schedule Post"}
          </button>
          <button onClick={() => void submit("now")} disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${EMERALD}, #007a4d)`, color: "#fff" }}>
            <Zap size={15} /> {busy ? "Working…" : "Post Now"}
          </button>
        </div>
        <AnimatePresence>
          {msg && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-0.5 rounded-lg border p-3 text-xs" role="status"
              style={{ borderColor: msg.kind === "ok" ? `${EMERALD}66` : "rgba(239,68,68,0.5)", color: msg.kind === "ok" ? EMERALD : "#F87171", background: msg.kind === "ok" ? "rgba(0,168,107,0.08)" : "rgba(239,68,68,0.08)" }}>
              {msg.lines.map((l) => <p key={l}>{msg.kind === "ok" ? "✓ " : "✗ "}{l}</p>)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── TAB: Content Calendar (real posts) ───────────────────────────────────────
function ContentCalendarTab({ data }: { data: Data }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<number | null>(null);
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay = useMemo(() => {
    const m = new Map<string, SocialPost[]>();
    for (const p of data.posts) {
      const k = dayKey(new Date(postDate(p)));
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return m;
  }, [data.posts]);

  const prev = () => { if (month === 0) { setYear((y) => y - 1); setMonth(11); } else setMonth((m) => m - 1); setSelected(null); };
  const next = () => { if (month === 11) { setYear((y) => y + 1); setMonth(0); } else setMonth((m) => m + 1); setSelected(null); };
  const dayPosts = selected ? byDay.get(`${year}-${month}-${selected}`) ?? [] : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        {PLATFORMS.map((k) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-slate-400"><span className="inline-block h-3 w-3 rounded-full" style={{ background: PLATFORM_COLOR[k] }} />{PLATFORM_LABEL[k]}</div>
        ))}
      </div>
      <div className="rounded-xl border p-5" style={CARD}>
        <div className="mb-4 flex items-center justify-between">
          <button onClick={prev} aria-label="Previous month" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/5"><ChevronLeft size={16} className="text-slate-400" /></button>
          <p className="text-sm font-bold text-slate-200">{MONTHS[month]} {year}</p>
          <button onClick={next} aria-label="Next month" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/5"><ChevronRight size={16} className="text-slate-400" /></button>
        </div>
        <div className="mb-2 grid grid-cols-7">{DAYS.map((d) => <p key={d} className="py-1 text-center text-[10px] font-semibold text-slate-500">{d}</p>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const posts = byDay.get(`${year}-${month}-${day}`) ?? [];
            const isToday = year === now.getFullYear() && month === now.getMonth() && day === now.getDate();
            const isSel = selected === day;
            return (
              <button key={day} onClick={() => setSelected(isSel ? null : day)}
                className="flex min-h-[52px] flex-col items-center gap-0.5 rounded-lg p-1.5 transition-all hover:bg-white/5"
                style={{ background: isSel ? "rgba(212,175,55,0.1)" : "transparent", border: isSel ? `1px solid ${GOLD}66` : "1px solid transparent", outline: isToday ? `1px solid ${GOLD}99` : "none" }}>
                <span className="text-xs font-medium" style={{ color: isToday ? GOLD : "#94a3b8" }}>{day}</span>
                <div className="flex flex-wrap justify-center gap-0.5">
                  {posts.slice(0, 4).map((p) => <span key={p.id} className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: PLATFORM_COLOR[p.platform] }} />)}
                </div>
              </button>
            );
          })}
        </div>
        {data.loaded && data.posts.length === 0 && <p className="mt-4 text-center text-xs text-slate-500">No posts yet — schedule one and it will appear here.</p>}
      </div>
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="rounded-xl border p-4" style={CARD}>
            <p className="mb-3 text-xs font-semibold text-slate-300">Posts on {MONTHS[month]} {selected}</p>
            {dayPosts.length === 0 ? <p className="text-xs text-slate-500">No posts on this day.</p>
              : <div className="space-y-2">{dayPosts.map((p) => <PostRow key={p.id} post={p} onChanged={data.refresh} />)}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── TAB: Analytics (computed from real posts) ────────────────────────────────
function Bars({ rows, color }: { rows: { label: string; value: number }[]; color: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex h-36 items-stretch gap-2">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] text-slate-400">{value}</span>
          <div className="flex w-full flex-1 items-end">
            <div className="w-full rounded-t-md transition-all" style={{ height: `${Math.max(value ? 6 : 0, (value / max) * 100)}%`, background: `linear-gradient(180deg, ${color}, ${color}66)` }} />
          </div>
          <span className="text-[10px] text-slate-500">{label}</span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsTab({ data }: { data: Data }) {
  const { posts, loaded } = data;
  const days = useMemo(() => {
    const out: { label: string; key: string }[] = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); out.push({ label: d.toLocaleDateString([], { weekday: "short" }), key: dayKey(d) }); }
    return out;
  }, []);
  const published = posts.filter((p) => p.status === "published");
  const perDay = days.map(({ label, key }) => ({ label, value: published.filter((p) => dayKey(new Date(p.published_at ?? p.created_at)) === key).length }));
  const perPlatform = PLATFORMS.map((k) => ({
    k,
    published: posts.filter((p) => p.platform === k && p.status === "published").length,
    scheduled: posts.filter((p) => p.platform === k && p.status === "scheduled").length,
    failed: posts.filter((p) => p.platform === k && p.status === "failed").length,
  }));
  const sorted = [...published].sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? "")).slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs" style={{ borderColor: `${GOLD}44`, background: `${GOLD}10`, color: GOLD }}>
        <Info size={14} className="mt-0.5 shrink-0" />
        <p>These figures are counted from your own posts. Followers, reach and engagement come from each platform&apos;s insights API and aren&apos;t connected yet, so they&apos;re not shown rather than invented.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {perPlatform.map(({ k, published: pub, scheduled, failed }) => (
          <div key={k} className="space-y-3 rounded-xl border p-4" style={CARD}>
            <div className="flex items-center gap-2"><PlatformIcon platform={k} size={13} /><span className="text-xs font-semibold text-slate-300">{PLATFORM_LABEL[k]}</span></div>
            <div className="grid grid-cols-3 gap-1 text-center">
              {[{ l: "Published", v: pub, c: "#60A5FA" }, { l: "Scheduled", v: scheduled, c: EMERALD }, { l: "Failed", v: failed, c: RED }].map(({ l, v, c }) => (
                <div key={l}><p className="text-lg font-bold" style={{ color: v ? c : "#64748b" }}>{loaded ? v : "–"}</p><p className="text-[9px] text-slate-500">{l}</p></div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-5" style={CARD}>
        <p className="mb-4 text-sm font-semibold text-slate-200">Posts published — last 7 days</p>
        {published.length === 0 && loaded ? <Empty icon={<BarChart2 size={26} />} title="No published posts yet" hint="Once posts go out, the daily chart fills in here." /> : <Bars rows={perDay} color={GOLD} />}
      </div>

      <div className="rounded-xl border p-5" style={CARD}>
        <p className="mb-4 text-sm font-semibold text-slate-200">Latest published posts</p>
        {sorted.length === 0 ? <p className="text-xs text-slate-500">Nothing published yet.</p> : (
          <div className="space-y-2">{sorted.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border p-3" style={CARD}>
              <PlatformIcon platform={p.platform} size={13} />
              <p className="min-w-0 flex-1 truncate text-xs text-slate-300">{p.content}</p>
              <span className="shrink-0 text-[10px] text-slate-500">{fmt(p.published_at)}</span>
            </div>
          ))}</div>
        )}
      </div>
    </div>
  );
}

// ── TAB: AI Content Generator (real) ─────────────────────────────────────────
function AIGeneratorTab({ onUse }: { onUse: (content: string, platform: PlatformKey) => void }) {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Professional");
  const [platform, setPlatform] = useState<PlatformKey>("linkedin");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SocialVariation[]>([]);
  const [usedAi, setUsedAi] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const TONES = ["Professional", "Casual", "Witty", "Inspirational"];

  const generate = async () => {
    setLoading(true); setError("");
    try {
      const r = await generateSocialContent({ topic, tone, platform }, getAccessToken());
      if (r.ok) { setResults(r.variations); setUsedAi(r.usedAi); } else { setResults([]); setError(r.error); }
    } catch { setError("Could not reach the server. Check your connection and try again."); }
    finally { setLoading(false); }
  };
  const copy = (i: number, text: string) => { navigator.clipboard.writeText(text).then(() => { setCopied(i); setTimeout(() => setCopied(null), 1500); }).catch(() => {}); };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-5" style={CARD}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-[10px] text-slate-500">Topic / Keyword</label>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !loading) void generate(); }} placeholder="e.g. product launch, tips…"
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-xs text-slate-300 outline-none placeholder:text-slate-600 focus:border-[#D4AF37]/50" style={{ borderColor: "rgba(128,128,128,0.25)" }} />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] text-slate-500">Brand Tone</label>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map((t) => (
                <button key={t} onClick={() => setTone(t)} className="rounded-lg border px-2.5 py-1 text-xs transition-all"
                  style={{ background: tone === t ? "rgba(212,175,55,0.12)" : "transparent", borderColor: tone === t ? `${GOLD}80` : "rgba(128,128,128,0.2)", color: tone === t ? GOLD : "#94a3b8" }}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] text-slate-500">Platform — {PLATFORM_LABEL[platform]}</label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((k) => (
                <button key={k} onClick={() => setPlatform(k)} title={PLATFORM_LABEL[k]} aria-label={PLATFORM_LABEL[k]}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border transition-all"
                  style={{ background: platform === k ? `${PLATFORM_COLOR[k]}22` : "transparent", borderColor: platform === k ? `${PLATFORM_COLOR[k]}99` : "rgba(128,128,128,0.2)" }}>
                  <PlatformIcon platform={k} size={13} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={() => void generate()} disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all hover:scale-[1.01] disabled:opacity-60"
          style={{ background: `linear-gradient(135deg, ${GOLD}, #b8962e)`, color: "#000" }}>
          <Sparkles size={15} className={loading ? "animate-spin" : ""} /> {loading ? "Generating…" : "Generate Content"}
        </button>
        {error && <p className="mt-3 text-xs text-red-400" role="alert">{error}</p>}
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <p className="text-[11px] text-slate-500">{usedAi ? "Written by AI for your topic." : "Template drafts built from your topic — add ANTHROPIC_API_KEY on the server for AI-written posts."}</p>
          {results.map((v, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="rounded-xl border p-5" style={CARD}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="text-[10px] font-semibold text-slate-500">Variation {i + 1} · {v.content.length} / {PLATFORM_LIMITS[platform]}</p>
                <div className="flex gap-2">
                  <button onClick={() => copy(i, v.content)} className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition-all" style={{ borderColor: "rgba(128,128,128,0.25)", color: copied === i ? EMERALD : "#94a3b8" }}>
                    {copied === i ? <Check size={11} /> : <Copy size={11} />} {copied === i ? "Copied" : "Copy"}
                  </button>
                  <button onClick={() => onUse(v.content, platform)} className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all" style={{ background: "rgba(212,175,55,0.12)", borderColor: `${GOLD}66`, color: GOLD }}>
                    <Send size={11} /> Use This
                  </button>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{v.content}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard", label: "Dashboard",        icon: LayoutDashboard },
  { id: "schedule",  label: "Schedule Post",    icon: Send },
  { id: "calendar",  label: "Content Calendar", icon: Calendar },
  { id: "analytics", label: "Analytics",        icon: BarChart2 },
  { id: "ai",        label: "AI Generator",     icon: Sparkles },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function Social() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [prefill, setPrefill] = useState<{ content: string; platform?: PlatformKey }>({ content: "" });
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [conns, setConns] = useState<Conns | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    const token = getAccessToken();
    getSocialPosts(undefined, token).then(setPosts).catch(() => setPosts([])).finally(() => setLoaded(true));
    getSocialConnections(token).then(setConns).catch(() => setConns(null));
  }, []);
  useEffect(() => { load(); }, [load]);

  const data: Data = { posts, conns, loaded, refresh: load };

  return (
    <div className="min-h-full p-6" style={{ background: BG }}>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(212,175,55,0.15)", border: `1px solid ${GOLD}30` }}><Share2 size={20} style={{ color: GOLD }} /></div>
        <div>
          <h1 className="text-lg font-bold text-slate-100">Social Media Scheduler</h1>
          <p className="text-xs text-slate-500">Plan, publish and track posts on Facebook, Instagram, LinkedIn and X</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-1 rounded-xl border p-1" style={CARD}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button key={id} onClick={() => setActiveTab(id)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all"
              style={{ background: active ? "rgba(212,175,55,0.12)" : "transparent", color: active ? GOLD : "#94a3b8", border: active ? `1px solid ${GOLD}40` : "1px solid transparent" }}>
              <Icon size={13} /> {label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
          {activeTab === "dashboard" && <DashboardTab data={data} />}
          {activeTab === "schedule"  && <SchedulePostTab data={data} initialContent={prefill.content} initialPlatform={prefill.platform} />}
          {activeTab === "calendar"  && <ContentCalendarTab data={data} />}
          {activeTab === "analytics" && <AnalyticsTab data={data} />}
          {activeTab === "ai"        && <AIGeneratorTab onUse={(content, platform) => { setPrefill({ content, platform }); setActiveTab("schedule"); }} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
