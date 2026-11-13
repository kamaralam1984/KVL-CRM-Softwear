// Social Planner — pure post validation shared by the UI (instant feedback) and the server
// actions (the real gate). No env / network access, so it is safe to import in the browser.

export type SocialPlatform = "facebook" | "instagram" | "linkedin" | "twitter";

export const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", twitter: "X (Twitter)",
};
export const PLATFORM_LIMITS: Record<SocialPlatform, number> = {
  facebook: 3000, instagram: 2200, linkedin: 3000, twitter: 280,
};
/** Post types the publishers can really send today. */
export const SUPPORTED_POST_TYPES = ["text", "image"] as const;

export interface PostInput { platform: SocialPlatform; postType: string; content: string; mediaUrl?: string }

export function validatePost(p: PostInput): string | null {
  const label = PLATFORM_LABEL[p.platform];
  const text = p.content.trim();
  if (!text) return "Write something to post.";
  if (text.length > PLATFORM_LIMITS[p.platform]) return `${label} allows ${PLATFORM_LIMITS[p.platform]} characters (you have ${text.length}).`;
  if (!(SUPPORTED_POST_TYPES as readonly string[]).includes(p.postType)) return "Video, Story and Reel posting isn't supported yet — use Text or Image.";

  const media = p.mediaUrl?.trim();
  if (p.postType === "image" || p.platform === "instagram") {
    if (!media) return p.platform === "instagram"
      ? "Instagram needs an image: choose Image and paste a public image link."
      : "Paste a public image link, or switch the post type to Text.";
    try {
      if (new URL(media).protocol !== "https:") return "The image link must start with https://";
    } catch { return "That image link isn't a valid web address."; }
    if (p.platform === "instagram" && p.postType !== "image") return "Instagram posts must be of type Image.";
  }
  if (p.postType === "image" && (p.platform === "linkedin" || p.platform === "twitter")) {
    return `Image posts are supported on Instagram and Facebook; use Text for ${label}.`;
  }
  return null;
}
