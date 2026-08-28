"use client";
// Phase 45 — Webinar Funnels. New section. Create/edit webinars (evergreen
// video or a real YouTube Live embed — no live-video engine of our own,
// same honest framing every comparable product in this space uses), see
// registrants + attendance stats.

import { useState, useEffect } from "react";
import { Video, Plus, Copy, Check, Trash2, ExternalLink, Users, Clock } from "lucide-react";
import {
  getWebinars, saveWebinar, publishWebinar, deleteWebinar, getRegistrations, isReminderEmailConfigured,
  type WebinarRow, type WebinarKind, type WebinarRegistration,
} from "@/lib/actions/webinars";
import { extractYoutubeVideoId } from "@/lib/webinars/youtube";
import { getAccessToken } from "@/lib/security/clientSession";

const GOLD = "#D4AF37";
const EMERALD = "#00A86B";

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `webinar-${Date.now().toString(36)}`;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function WebinarEditor({ webinar, onClose, onSaved }: { webinar: WebinarRow; onClose: () => void; onSaved: (w: WebinarRow) => void }) {
  const [title, setTitle] = useState(webinar.title);
  const [description, setDescription] = useState(webinar.description);
  const [kind, setKind] = useState<WebinarKind>(webinar.kind);
  const [videoUrl, setVideoUrl] = useState(webinar.video_url);
  const [youtubeInput, setYoutubeInput] = useState(webinar.youtube_video_id);
  const [scheduledAt, setScheduledAt] = useState(toDatetimeLocal(webinar.scheduled_at));
  const [durationMinutes, setDurationMinutes] = useState(webinar.duration_minutes);
  const [reminder24h, setReminder24h] = useState(webinar.reminder_24h);
  const [reminder1h, setReminder1h] = useState(webinar.reminder_1h);
  const [registrations, setRegistrations] = useState<WebinarRegistration[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!webinar.id.startsWith("draft-")) {
      getRegistrations(webinar.id, getAccessToken()).then(setRegistrations).catch(() => {});
    }
  }, [webinar.id]);

  const save = async () => {
    const youtubeVideoId = kind === "youtube_live" ? (extractYoutubeVideoId(youtubeInput) ?? "") : "";
    const result = await saveWebinar({
      id: webinar.id.startsWith("draft-") ? undefined : webinar.id,
      title, slug: webinar.slug, description, kind, videoUrl, youtubeVideoId,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      durationMinutes, reminder24h, reminder1h,
    }, getAccessToken());
    if (result) { onSaved(result); setSaved(true); setTimeout(() => setSaved(false), 1500); }
    return result;
  };

  const publish = async () => {
    const result = await save();
    if (result && !result.id.startsWith("draft-")) await publishWebinar(result.id, getAccessToken());
  };

  const attended = registrations.filter((r) => r.attended).length;
  const avgWatch = registrations.length ? Math.round(registrations.reduce((s, r) => s + r.watch_duration_seconds, 0) / registrations.length / 60) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300">← Back to Webinars</button>
        <div className="flex gap-2">
          <button onClick={save} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(212,175,55,0.12)", color: GOLD }}>
            {saved ? "Saved ✓" : "Save Draft"}
          </button>
          <button onClick={publish} className="px-3 py-1.5 rounded-lg text-xs font-bold text-black" style={{ background: GOLD }}>Publish</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Webinar title"
          className="px-3 py-2 rounded-lg text-sm bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
        <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
      </div>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Description"
        className="w-full px-3 py-2 rounded-lg text-sm bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />

      <div className="flex gap-2">
        {(["evergreen", "youtube_live"] as WebinarKind[]).map((k) => (
          <button key={k} onClick={() => setKind(k)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold border"
            style={{ background: kind === k ? "rgba(212,175,55,0.12)" : "transparent", borderColor: kind === k ? GOLD + "60" : "rgba(255,255,255,0.08)", color: kind === k ? GOLD : "#64748b" }}>
            {k === "evergreen" ? "Evergreen (recorded video)" : "YouTube Live embed"}
          </button>
        ))}
      </div>

      {kind === "evergreen" ? (
        <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Video file URL (mp4)"
          className="w-full px-3 py-2 rounded-lg text-sm bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
      ) : (
        <input value={youtubeInput} onChange={(e) => setYoutubeInput(e.target.value)} placeholder="YouTube Live URL or video id"
          className="w-full px-3 py-2 rounded-lg text-sm bg-white/[0.04] border border-crm-border text-slate-200 outline-none" />
      )}

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          <input type="checkbox" checked={reminder24h} onChange={(e) => setReminder24h(e.target.checked)} /> 24h reminder
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          <input type="checkbox" checked={reminder1h} onChange={(e) => setReminder1h(e.target.checked)} /> 1h reminder
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          Duration <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value) || 60)}
            className="w-16 px-2 py-1 rounded-lg text-xs bg-white/[0.04] border border-crm-border text-slate-200 outline-none" /> min
        </label>
      </div>

      {!webinar.id.startsWith("draft-") && (
        <div className="rounded-xl border p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 text-xs text-slate-400"><Users size={13} /> {registrations.length} registered</div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: EMERALD }}><Check size={13} /> {attended} attended</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400"><Clock size={13} /> {avgWatch}m avg watch</div>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {registrations.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-[11px] p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                <span className="text-slate-300">{r.name} · {r.email}</span>
                <span style={{ color: r.attended ? EMERALD : "#64748b" }}>{r.attended ? `Watched ${Math.round(r.watch_duration_seconds / 60)}m` : "Registered"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Webinars() {
  const [webinars, setWebinars] = useState<WebinarRow[]>([]);
  const [editing, setEditing] = useState<WebinarRow | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [emailConfigured, setEmailConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    getWebinars(undefined, getAccessToken()).then(setWebinars).catch(() => {});
    isReminderEmailConfigured().then(setEmailConfigured).catch(() => setEmailConfigured(false));
  }, []);

  const createNew = () => {
    const title = "Untitled Webinar";
    setEditing({
      id: `draft-${Date.now()}`, site_id: "", slug: slugify(`${title}-${Date.now()}`), title, description: "",
      kind: "evergreen", video_url: "", youtube_video_id: "", scheduled_at: null, duration_minutes: 60,
      reminder_24h: true, reminder_1h: true, published: false, created_at: new Date().toISOString(),
    });
  };

  const onSaved = (w: WebinarRow) => {
    setWebinars((prev) => {
      const exists = prev.some((p) => p.id === w.id);
      return exists ? prev.map((p) => (p.id === w.id ? w : p)) : [w, ...prev];
    });
    setEditing(w);
  };

  const remove = async (id: string) => {
    const res = await deleteWebinar(id, getAccessToken());
    if (res.ok) setWebinars((prev) => prev.filter((w) => w.id !== id));
  };

  const copyLink = (slug: string) => {
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/webinar/${slug}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(slug);
    setTimeout(() => setCopied(null), 1500);
  };

  if (editing) {
    return (
      <div className="h-full overflow-y-auto p-6" style={{ background: "#080c14" }}>
        <WebinarEditor webinar={editing} onClose={() => setEditing(null)} onSaved={onSaved} />
      </div>
    );
  }

  return (
    <div className="p-6 min-h-full" style={{ background: "#080c14" }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,175,55,0.15)", border: `1px solid ${GOLD}30` }}>
            <Video size={20} style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100">Webinar Funnels</h1>
            <p className="text-xs text-slate-500">Registration, reminders, and attendee tracking around a real video source</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {emailConfigured !== null && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: emailConfigured ? "rgba(0,168,107,0.12)" : "rgba(255,255,255,0.05)", color: emailConfigured ? EMERALD : "#64748b" }}>
              {emailConfigured ? "Reminder Emails Connected" : "Reminder Emails Not Configured — will mock"}
            </span>
          )}
          <button onClick={createNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-black" style={{ background: `linear-gradient(135deg,${GOLD},#F5C842)` }}>
            <Plus size={13} /> New Webinar
          </button>
        </div>
      </div>

      {webinars.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-24 text-slate-600">
          <Video size={28} className="mb-2 opacity-40" />
          <p className="text-xs">No webinars yet — create one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {webinars.map((w) => (
            <div key={w.id} className="rounded-2xl border border-crm-border p-4 space-y-2" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-200 truncate">{w.title}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(212,175,55,0.1)", color: GOLD }}>
                  {w.kind === "youtube_live" ? "YouTube Live" : "Evergreen"}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                {w.scheduled_at ? new Date(w.scheduled_at).toLocaleString() : "No date set"} · {w.published ? <span style={{ color: EMERALD }}>Published</span> : "Draft"}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => setEditing(w)} className="text-[11px] font-semibold" style={{ color: GOLD }}>Edit</button>
                {w.published && (
                  <button onClick={() => copyLink(w.slug)} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200">
                    {copied === w.slug ? <Check size={11} /> : <Copy size={11} />} Link
                  </button>
                )}
                {w.published && (
                  <a href={`/webinar/${w.slug}`} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-300"><ExternalLink size={11} /></a>
                )}
                <button onClick={() => remove(w.id)} className="ml-auto text-rose-400 hover:text-rose-300"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
