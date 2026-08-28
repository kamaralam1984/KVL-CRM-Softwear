"use server";
// Phase 45 — Webinar Funnels. CRUD for `webinars` + public-facing
// registration/attendance/chat actions for the registration and room routes.

import { headers } from "next/headers";
import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";
import { rateLimit } from "@/lib/security/rateLimit";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";
import { isEmailConfigured } from "@/lib/messaging/send";

// Gap-check fix: isEmailConfigured reads process.env directly, so it can
// never be imported into a "use client" component (env vars resolve
// undefined there). This thin wrapper is the safe boundary the Webinars
// section calls to show a real "reminder emails configured?" badge,
// mirroring lib/actions/callTracking.ts::isTelephonyConfigured's fix for
// the identical dead-code class in Phase 41.
export async function isReminderEmailConfigured(): Promise<boolean> {
  return isEmailConfigured();
}

// Same pattern as lib/actions/forms.ts's clientIpFromHeaders — Server
// Actions get no NextRequest, so the client IP comes from next/headers.
async function clientIpFromHeaders(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

const MAX_NAME_LENGTH = 200;
const MAX_CHAT_MESSAGE_LENGTH = 500;

export type WebinarKind = "evergreen" | "youtube_live";

export type WebinarRow = {
  id: string;
  site_id: string;
  slug: string;
  title: string;
  description: string;
  kind: WebinarKind;
  video_url: string;
  youtube_video_id: string;
  scheduled_at: string | null;
  duration_minutes: number;
  reminder_24h: boolean;
  reminder_1h: boolean;
  published: boolean;
  created_at: string;
};

export type WebinarRegistration = {
  id: string;
  webinar_id: string;
  name: string;
  email: string;
  phone: string;
  attended: boolean;
  watch_duration_seconds: number;
  joined_at: string | null;
  created_at: string;
};

export type WebinarChatMessage = {
  id: string;
  webinar_id: string;
  name: string;
  body: string;
  created_at: string;
};

// ── Staff CRUD (RBAC via the existing "funnels" resource, same as
// lib/actions/pages.ts/forms.ts) ────────────────────────────────────────────

export async function getWebinars(siteId = DEFAULT_SITE_ID, accessToken?: string): Promise<WebinarRow[]> {
  if (!(await assertCan(accessToken, "funnels", "read"))) return [];
  try {
    const db = getServerClient();
    const { data, error } = await db.from("webinars").select("*").eq("site_id", siteId).order("created_at", { ascending: false });
    if (error) { console.error("[webinars] getWebinars failed:", error.message); return []; }
    return (data ?? []) as WebinarRow[];
  } catch (err) {
    console.error("[webinars] getWebinars error:", err);
    return [];
  }
}

export async function saveWebinar(
  input: {
    id?: string; title: string; slug: string; description: string; kind: WebinarKind;
    videoUrl: string; youtubeVideoId: string; scheduledAt: string | null; durationMinutes: number;
    reminder24h: boolean; reminder1h: boolean; siteId?: string;
  },
  accessToken?: string,
): Promise<WebinarRow | null> {
  if (!(await assertCan(accessToken, "funnels", input.id ? "update" : "create"))) return null;
  const siteId = input.siteId ?? DEFAULT_SITE_ID;

  const patch = {
    title: input.title,
    description: input.description,
    kind: input.kind,
    video_url: input.videoUrl,
    youtube_video_id: input.youtubeVideoId,
    scheduled_at: input.scheduledAt,
    duration_minutes: input.durationMinutes,
    reminder_24h: input.reminder24h,
    reminder_1h: input.reminder1h,
  };

  try {
    const db = getServerClient();
    if (input.id) {
      const { data, error } = await db.from("webinars").update(patch).eq("id", input.id).select().single();
      if (error) { console.error("[webinars] saveWebinar update failed:", error.message); return null; }
      return data as WebinarRow;
    }
    const { data, error } = await db
      .from("webinars")
      .upsert({ site_id: siteId, slug: input.slug, published: false, ...patch }, { onConflict: "site_id,slug" })
      .select()
      .single();
    if (error) { console.error("[webinars] saveWebinar insert failed:", error.message); return null; }
    return data as WebinarRow;
  } catch (err) {
    console.error("[webinars] saveWebinar error:", err);
    return null;
  }
}

export async function publishWebinar(id: string, accessToken?: string): Promise<{ ok: boolean }> {
  if (!(await assertCan(accessToken, "funnels", "update"))) return { ok: false };
  try {
    const db = getServerClient();
    const { error } = await db.from("webinars").update({ published: true }).eq("id", id);
    if (error) { console.error("[webinars] publishWebinar failed:", error.message); return { ok: false }; }
    return { ok: true };
  } catch (err) {
    console.error("[webinars] publishWebinar error:", err);
    return { ok: false };
  }
}

export async function deleteWebinar(id: string, accessToken?: string): Promise<{ ok: boolean }> {
  if (!(await assertCan(accessToken, "funnels", "delete"))) return { ok: false };
  try {
    const db = getServerClient();
    const { error } = await db.from("webinars").delete().eq("id", id);
    if (error) { console.error("[webinars] deleteWebinar failed:", error.message); return { ok: false }; }
    return { ok: true };
  } catch (err) {
    console.error("[webinars] deleteWebinar error:", err);
    return { ok: false };
  }
}

export async function getRegistrations(webinarId: string, accessToken?: string): Promise<WebinarRegistration[]> {
  if (!(await assertCan(accessToken, "funnels", "read"))) return [];
  try {
    const db = getServerClient();
    const { data, error } = await db.from("webinar_registrations").select("*").eq("webinar_id", webinarId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as WebinarRegistration[];
  } catch (err) {
    console.error("[webinars] getRegistrations error:", err);
    return [];
  }
}

// ── Public — registration page + room page, no RBAC (same trust model as
// lib/actions/pages.ts::getPageBySlug / lib/actions/forms.ts::getFormBySlug) ─

export async function getWebinarBySlug(slug: string, siteId = DEFAULT_SITE_ID): Promise<WebinarRow | null> {
  try {
    const db = getServerClient();
    const { data, error } = await db.from("webinars").select("*").eq("site_id", siteId).eq("slug", slug).eq("published", true).maybeSingle();
    if (error || !data) return null;
    return data as WebinarRow;
  } catch (err) {
    console.error("[webinars] getWebinarBySlug failed:", err);
    return null;
  }
}

// Public, unauthenticated write — rate-limited + input-truncated from the
// start (the last gap-check found submitForm missing exactly this; not
// repeating that gap here).
export async function registerForWebinar(
  webinarId: string,
  input: { name: string; email: string; phone: string },
): Promise<{ ok: boolean; registrationId?: string }> {
  try {
    const ip = await clientIpFromHeaders();
    const limit = rateLimit(`webinars:register:${ip}`, 20, 60_000);
    if (!limit.allowed) return { ok: false };

    const name = input.name.trim().slice(0, MAX_NAME_LENGTH);
    const email = input.email.trim().slice(0, MAX_NAME_LENGTH);
    const phone = input.phone.trim().slice(0, 40);
    if (!name || !email) return { ok: false };

    const db = getServerClient();
    const { data: webinar, error: webErr } = await db.from("webinars").select("id").eq("id", webinarId).eq("published", true).maybeSingle();
    if (webErr || !webinar) return { ok: false };

    const { data, error } = await db.from("webinar_registrations").insert({ webinar_id: webinarId, name, email, phone }).select("id").single();
    if (error) { console.error("[webinars] registerForWebinar insert failed:", error.message); return { ok: false }; }

    return { ok: true, registrationId: data.id as string };
  } catch (err) {
    console.error("[webinars] registerForWebinar error:", err);
    return { ok: false };
  }
}

// Gap-check fix — registrationId is a random uuid used as a de facto access
// token for "mark my own attendance". This is a WEAKER check than Phase
// 23's webchat (verifyWebchatConversationOwnership requires site_id +
// channel + external_thread_id to all match, not just "id exists") — that
// stricter comparison was inaccurate to claim here, corrected. The weaker
// check is still a defensible, deliberate tradeoff given the low
// sensitivity of what it can affect (an attendance flag / watch-time
// count, not message contents or PII disclosure), but both endpoints are
// now rate-limited like every other public write path in this codebase —
// the exact gap class an earlier audit found missing on submitForm.
export async function recordWebinarJoin(registrationId: string): Promise<void> {
  try {
    const ip = await clientIpFromHeaders();
    const limit = rateLimit(`webinars:join:${ip}`, 30, 60_000);
    if (!limit.allowed) return;

    const db = getServerClient();
    await db.from("webinar_registrations").update({ attended: true, joined_at: new Date().toISOString() }).eq("id", registrationId);
  } catch (err) {
    console.error("[webinars] recordWebinarJoin failed:", err);
  }
}

// Non-atomic read-then-write increment — same documented residual-risk
// pattern as lib/actions/pages.ts::recordPageHit. additionalSeconds is
// clamped — the room client only ever sends 30 (its polling interval), so
// anything larger is rejected rather than trusted, closing off inflating
// watch-time stats via a direct call.
const MAX_WATCH_INCREMENT_SECONDS = 60;

export async function recordWatchTime(registrationId: string, additionalSeconds: number): Promise<void> {
  try {
    const ip = await clientIpFromHeaders();
    const limit = rateLimit(`webinars:watch:${ip}`, 30, 60_000);
    if (!limit.allowed) return;

    const clamped = Math.min(Math.max(0, additionalSeconds), MAX_WATCH_INCREMENT_SECONDS);
    const db = getServerClient();
    const { data } = await db.from("webinar_registrations").select("watch_duration_seconds").eq("id", registrationId).maybeSingle();
    if (data) {
      await db.from("webinar_registrations").update({ watch_duration_seconds: (data.watch_duration_seconds ?? 0) + clamped }).eq("id", registrationId);
    }
  } catch (err) {
    console.error("[webinars] recordWatchTime failed:", err);
  }
}

// ── Room chat — public, rate-limited, many-viewer broadcast (a genuinely
// different shape from Phase 21/23's 1:1 conversations/messages) ───────────

export async function postWebinarChatMessage(webinarId: string, name: string, body: string): Promise<{ ok: boolean }> {
  try {
    const ip = await clientIpFromHeaders();
    const limit = rateLimit(`webinars:chat:${ip}`, 30, 60_000);
    if (!limit.allowed) return { ok: false };

    const cleanName = (name.trim() || "Guest").slice(0, MAX_NAME_LENGTH);
    const cleanBody = body.trim().slice(0, MAX_CHAT_MESSAGE_LENGTH);
    if (!cleanBody) return { ok: false };

    const db = getServerClient();
    const { error } = await db.from("webinar_chat_messages").insert({ webinar_id: webinarId, name: cleanName, body: cleanBody });
    if (error) { console.error("[webinars] postWebinarChatMessage failed:", error.message); return { ok: false }; }
    return { ok: true };
  } catch (err) {
    console.error("[webinars] postWebinarChatMessage error:", err);
    return { ok: false };
  }
}

export async function getWebinarChatMessages(webinarId: string, sinceIso?: string): Promise<WebinarChatMessage[]> {
  try {
    const db = getServerClient();
    let q = db.from("webinar_chat_messages").select("*").eq("webinar_id", webinarId).order("created_at", { ascending: true }).limit(200);
    if (sinceIso) q = q.gt("created_at", sinceIso);
    const { data, error } = await q;
    if (error || !data) return [];
    return data as WebinarChatMessage[];
  } catch (err) {
    console.error("[webinars] getWebinarChatMessages failed:", err);
    return [];
  }
}
