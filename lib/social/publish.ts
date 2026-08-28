// Phase 25 — Social Planner: real ORGANIC post publish. Distinct from
// lib/marketing/channels.ts, which only ever publishes paid ad campaigns —
// same hosts (graph.facebook.com, api.linkedin.com), different endpoints
// (a Page's /feed, not the Marketing/Ads API), so it's the same proven
// fetch/auth pattern applied to a different operation, not new integration
// risk. Real when a Page/organization credential is configured, mock
// (logged) otherwise — never throws.

export interface SocialPublishResult {
  ok: boolean;
  mock: boolean;
  externalPostId?: string;
  detail?: string;
}

function mockResult(platform: string, content: string): SocialPublishResult {
  console.log(`[social:${platform}:mock] post "${content.slice(0, 60)}..." published`);
  return { ok: true, mock: true, detail: "logged (mock) — organic publish credential not configured" };
}

// --- FACEBOOK PAGE (organic) -----------------------------------------------
export async function publishFacebookPost(content: string): Promise<SocialPublishResult> {
  const pageId = process.env.META_PAGE_ID;
  const pageToken = process.env.META_PAGE_ACCESS_TOKEN;
  if (!pageId || !pageToken) return mockResult("facebook", content);

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: content, access_token: pageToken }),
    });
    if (!res.ok) {
      console.error(`[social] facebook publish HTTP ${res.status}`);
      return { ok: false, mock: false, detail: `facebook ${res.status}` };
    }
    const j = (await res.json()) as { id?: string };
    return { ok: true, mock: false, externalPostId: j.id };
  } catch (err) {
    console.error("[social] facebook publish error:", err);
    return { ok: false, mock: false, detail: String(err) };
  }
}

// --- INSTAGRAM (organic, via the connected Facebook Page's IG Business account) ---
export async function publishInstagramPost(content: string, imageUrl?: string): Promise<SocialPublishResult> {
  const igUserId = process.env.META_INSTAGRAM_USER_ID;
  const pageToken = process.env.META_PAGE_ACCESS_TOKEN;
  if (!igUserId || !pageToken || !imageUrl) return mockResult("instagram", content); // IG requires media — no text-only posts

  try {
    const createRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, caption: content, access_token: pageToken }),
    });
    if (!createRes.ok) {
      console.error(`[social] instagram media-create HTTP ${createRes.status}`);
      return { ok: false, mock: false, detail: `instagram create ${createRes.status}` };
    }
    const { id: creationId } = (await createRes.json()) as { id?: string };
    if (!creationId) return { ok: false, mock: false, detail: "instagram: no creation id returned" };

    const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: creationId, access_token: pageToken }),
    });
    if (!publishRes.ok) {
      console.error(`[social] instagram media-publish HTTP ${publishRes.status}`);
      return { ok: false, mock: false, detail: `instagram publish ${publishRes.status}` };
    }
    const j = (await publishRes.json()) as { id?: string };
    return { ok: true, mock: false, externalPostId: j.id };
  } catch (err) {
    console.error("[social] instagram publish error:", err);
    return { ok: false, mock: false, detail: String(err) };
  }
}

// --- LINKEDIN (organic, via a company Page) --------------------------------
export async function publishLinkedinPost(content: string): Promise<SocialPublishResult> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN; // same token already used for lead sourcing/ads
  const orgUrn = process.env.LINKEDIN_ORGANIZATION_URN; // e.g. "urn:li:organization:12345678"
  if (!token || !orgUrn) return mockResult("linkedin", content);

  try {
    const res = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: orgUrn,
        commentary: content,
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });
    if (!res.ok) {
      console.error(`[social] linkedin publish HTTP ${res.status}`);
      return { ok: false, mock: false, detail: `linkedin ${res.status}` };
    }
    const id = res.headers.get("x-restli-id") ?? undefined;
    return { ok: true, mock: false, externalPostId: id };
  } catch (err) {
    console.error("[social] linkedin publish error:", err);
    return { ok: false, mock: false, detail: String(err) };
  }
}

export type SocialPlatform = "facebook" | "instagram" | "linkedin" | "twitter" | "youtube";

export async function publishSocialPost(platform: SocialPlatform, content: string, mediaUrl?: string): Promise<SocialPublishResult> {
  switch (platform) {
    case "facebook": return publishFacebookPost(content);
    case "instagram": return publishInstagramPost(content, mediaUrl);
    case "linkedin": return publishLinkedinPost(content);
    default: return mockResult(platform, content); // twitter/youtube: no publisher wired yet, honestly mocked
  }
}
