"use server";
// Phase 25 — Social Planner. CRUD for `social_posts` + the two actions the
// Schedule Post tab's buttons call: schedule for later, or publish now.

import { getDb } from "@/lib/db";
import { assertCan, assertCanStrict } from "@/lib/security/requireAction";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";
import { publishSocialPost } from "@/lib/social/publish";
import { platformConnection, type PlatformConnection } from "@/lib/social/connections";
import { validatePost, PLATFORM_LABEL, type SocialPlatform } from "@/lib/social/validate";

export type SocialPostStatus = "draft" | "scheduled" | "published" | "failed";

export type SocialPost = {
  id: string;
  site_id: string;
  platform: SocialPlatform;
  post_type: string;
  content: string;
  media_urls: string[];
  scheduled_at: string | null;
  status: SocialPostStatus;
  external_post_id: string | null;
  published_at: string | null;
  created_at: string;
};

export async function getSocialPosts(siteId = DEFAULT_SITE_ID, accessToken?: string): Promise<SocialPost[]> {
  if (!(await assertCan(accessToken, "social", "read"))) return [];
  try {
    const db = getDb();
    const { data, error } = await db
      .from("social_posts")
      .select("*")
      .eq("site_id", siteId)
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) { console.error("[social] getSocialPosts failed:", error.message); return []; }
    return (data ?? []) as SocialPost[];
  } catch (err) {
    console.error("[social] getSocialPosts error:", err);
    return [];
  }
}

export type PostInput = { platform: SocialPlatform; postType: string; content: string; mediaUrls: string[] };
export type ActionResult = { ok: boolean; error?: string };

/** Which platforms have publishing credentials on the server (names of missing variables only, never values). */
export async function getSocialConnections(accessToken?: string): Promise<Record<SocialPlatform, PlatformConnection>> {
  const all = (["facebook", "instagram", "linkedin", "twitter"] as SocialPlatform[]);
  const empty = Object.fromEntries(all.map((p) => [p, { connected: false, missing: [] as string[] }])) as Record<SocialPlatform, PlatformConnection>;
  if (!(await assertCan(accessToken, "social", "read"))) return empty;
  return Object.fromEntries(all.map((p) => [p, platformConnection(p)])) as Record<SocialPlatform, PlatformConnection>;
}

// Shared gate for every outbound action: valid post + the platform really has credentials.
// Without credentials the publisher only LOGS (mock), so we refuse instead of recording a
// post as "published" that never left the server.
function gate(input: PostInput): string | null {
  const bad = validatePost({ platform: input.platform, postType: input.postType, content: input.content, mediaUrl: input.mediaUrls[0] });
  if (bad) return bad;
  const conn = platformConnection(input.platform);
  if (!conn.connected) return `${PLATFORM_LABEL[input.platform]} isn't connected on the server yet (missing ${conn.missing.join(", ")}).`;
  return null;
}

async function insertPost(input: {
  platform: SocialPlatform; postType: string; content: string; mediaUrls: string[];
  scheduledAt: string | null; status: SocialPostStatus; siteId?: string;
}) {
  const db = getDb();
  return db.from("social_posts").insert({
    site_id: input.siteId ?? DEFAULT_SITE_ID,
    platform: input.platform,
    post_type: input.postType,
    content: input.content,
    media_urls: input.mediaUrls,
    scheduled_at: input.scheduledAt,
    status: input.status,
  }).select().single();
}

// "Schedule Post" — persists as status="scheduled"; the cron route (app/api/social/cron) fires it
// when scheduled_at arrives.
export async function schedulePost(input: PostInput & { scheduledAt: string }, accessToken?: string): Promise<ActionResult> {
  if (!(await assertCanStrict(accessToken, "social", "create"))) return { ok: false, error: "Sign in with a role that can post to social media." };
  const bad = gate(input);
  if (bad) return { ok: false, error: bad };
  const when = new Date(input.scheduledAt);
  if (isNaN(when.getTime())) return { ok: false, error: "Pick a valid date and time." };
  if (when.getTime() < Date.now() - 60_000) return { ok: false, error: "That time has already passed — pick a future date and time." };
  try {
    const { error } = await insertPost({ ...input, scheduledAt: when.toISOString(), status: "scheduled" });
    if (error) { console.error("[social] schedulePost failed:", error.message); return { ok: false, error: "Could not save the post — check the database connection." }; }
    return { ok: true };
  } catch (err) {
    console.error("[social] schedulePost error:", err);
    return { ok: false, error: "Could not save the post — check the database connection." };
  }
}

// "Post Now" — publishes immediately, then records the real result (published or failed).
export async function postSocialNow(input: PostInput, accessToken?: string): Promise<ActionResult> {
  if (!(await assertCanStrict(accessToken, "social", "create"))) return { ok: false, error: "Sign in with a role that can post to social media." };
  const bad = gate(input);
  if (bad) return { ok: false, error: bad };

  const result = await publishSocialPost(input.platform, input.content, input.mediaUrls[0]);
  try {
    const { data, error } = await insertPost({ ...input, scheduledAt: null, status: result.ok ? "published" : "failed" });
    if (error) console.error("[social] postSocialNow record failed:", error.message);
    else if (result.ok && data) {
      await getDb().from("social_posts")
        .update({ external_post_id: result.externalPostId ?? null, published_at: new Date().toISOString() })
        .eq("id", data.id);
    }
  } catch (err) {
    console.error("[social] postSocialNow persistence error:", err);
  }
  return result.ok ? { ok: true } : { ok: false, error: `${PLATFORM_LABEL[input.platform]} rejected the post${result.detail ? ` (${result.detail})` : ""}.` };
}

// Retry a failed/draft/scheduled post right now.
export async function retrySocialPost(id: string, accessToken?: string): Promise<ActionResult> {
  if (!(await assertCanStrict(accessToken, "social", "update"))) return { ok: false, error: "Sign in with a role that can post to social media." };
  try {
    const db = getDb();
    const { data: row } = await db.from("social_posts").select("*").eq("id", id).maybeSingle();
    if (!row) return { ok: false, error: "Post not found." };
    const post = row as SocialPost;
    if (post.status === "published") return { ok: false, error: "This post is already published." };
    const input: PostInput = { platform: post.platform, postType: post.post_type, content: post.content, mediaUrls: post.media_urls ?? [] };
    const bad = gate(input);
    if (bad) return { ok: false, error: bad };
    const result = await publishSocialPost(post.platform, post.content, post.media_urls?.[0]);
    await db.from("social_posts").update({
      status: result.ok ? "published" : "failed",
      external_post_id: result.externalPostId ?? null,
      published_at: result.ok ? new Date().toISOString() : null,
    }).eq("id", id);
    return result.ok ? { ok: true } : { ok: false, error: `${PLATFORM_LABEL[post.platform]} rejected the post${result.detail ? ` (${result.detail})` : ""}.` };
  } catch (err) {
    console.error("[social] retrySocialPost error:", err);
    return { ok: false, error: "Could not retry — check the database connection." };
  }
}

// Remove a post that hasn't gone out (scheduled / draft / failed). Published posts stay as a record.
export async function cancelSocialPost(id: string, accessToken?: string): Promise<ActionResult> {
  if (!(await assertCanStrict(accessToken, "social", "delete"))) return { ok: false, error: "Sign in with a role that can delete social posts." };
  try {
    const { error } = await getDb().from("social_posts").delete().eq("id", id).neq("status", "published");
    if (error) return { ok: false, error: "Could not remove the post." };
    return { ok: true };
  } catch (err) {
    console.error("[social] cancelSocialPost error:", err);
    return { ok: false, error: "Could not remove the post." };
  }
}

// Called by the cron route — publishes every due scheduled post. A post whose platform has no
// credentials is marked failed (never "published").
export async function publishDueSocialPosts(): Promise<{ processed: number; published: number }> {
  try {
    const db = getDb();
    const { data, error } = await db
      .from("social_posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .limit(50);
    if (error || !data?.length) return { processed: 0, published: 0 };

    let published = 0;
    for (const row of data as SocialPost[]) {
      const connected = platformConnection(row.platform).connected;
      const result = connected
        ? await publishSocialPost(row.platform, row.content, row.media_urls?.[0])
        : { ok: false, mock: false, externalPostId: undefined };
      await db.from("social_posts").update({
        status: result.ok ? "published" : "failed",
        external_post_id: result.externalPostId ?? null,
        published_at: result.ok ? new Date().toISOString() : null,
      }).eq("id", row.id);
      if (result.ok) published++;
    }
    return { processed: data.length, published };
  } catch (err) {
    console.error("[social] publishDueSocialPosts failed:", err);
    return { processed: 0, published: 0 };
  }
}
