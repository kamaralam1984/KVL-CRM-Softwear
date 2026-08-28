"use server";
// Phase 25 — Social Planner. CRUD for `social_posts` + the two actions the
// Schedule Post tab's buttons call: schedule for later, or publish now.

import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";
import { publishSocialPost, type SocialPlatform } from "@/lib/social/publish";

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
    const db = getServerClient();
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

async function insertPost(input: {
  platform: SocialPlatform; postType: string; content: string; mediaUrls: string[];
  scheduledAt: string | null; status: SocialPostStatus; siteId?: string;
}) {
  const db = getServerClient();
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

// "Schedule Post" button — persists as status="scheduled"; the cron route
// (app/api/social/cron) fires it when scheduled_at arrives.
export async function schedulePost(
  input: { platform: SocialPlatform; postType: string; content: string; mediaUrls: string[]; scheduledAt: string },
  accessToken?: string,
): Promise<{ ok: boolean }> {
  if (!(await assertCan(accessToken, "social", "create"))) return { ok: false };
  try {
    const { error } = await insertPost({ ...input, status: "scheduled" });
    if (error) { console.error("[social] schedulePost failed:", error.message); return { ok: false }; }
    return { ok: true };
  } catch (err) {
    console.error("[social] schedulePost error:", err);
    return { ok: false };
  }
}

// "Post Now" button — publishes immediately via lib/social/publish.ts, then
// records the result either way (published or failed), never throws.
export async function postSocialNow(
  input: { platform: SocialPlatform; postType: string; content: string; mediaUrls: string[] },
  accessToken?: string,
): Promise<{ ok: boolean; mock: boolean }> {
  if (!(await assertCan(accessToken, "social", "create"))) return { ok: false, mock: false };

  const result = await publishSocialPost(input.platform, input.content, input.mediaUrls[0]);
  try {
    const { data, error } = await insertPost({
      ...input,
      scheduledAt: null,
      status: result.ok ? "published" : "failed",
    });
    if (error) { console.error("[social] postSocialNow record failed:", error.message); }
    else if (result.ok && data) {
      const db = getServerClient();
      await db.from("social_posts")
        .update({ external_post_id: result.externalPostId ?? null, published_at: new Date().toISOString() })
        .eq("id", data.id);
    }
  } catch (err) {
    console.error("[social] postSocialNow persistence error:", err);
  }
  return { ok: result.ok, mock: result.mock };
}

// Called by the cron route — publishes every due scheduled post.
export async function publishDueSocialPosts(): Promise<{ processed: number; published: number }> {
  try {
    const db = getServerClient();
    const { data, error } = await db
      .from("social_posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .limit(50);
    if (error || !data?.length) return { processed: 0, published: 0 };

    let published = 0;
    for (const row of data as SocialPost[]) {
      const result = await publishSocialPost(row.platform, row.content, row.media_urls?.[0]);
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
