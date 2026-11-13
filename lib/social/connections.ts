// Which social platforms have publishing credentials on the server. Reports only WHICH variable
// names are missing — never any value.

import type { SocialPlatform } from "./validate";

const REQUIRED: Record<SocialPlatform, string[]> = {
  facebook: ["META_PAGE_ID", "META_PAGE_ACCESS_TOKEN"],
  instagram: ["META_INSTAGRAM_USER_ID", "META_PAGE_ACCESS_TOKEN"],
  linkedin: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_ORGANIZATION_URN"],
  twitter: ["TWITTER_API_KEY", "TWITTER_API_SECRET", "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_SECRET"],
};

export interface PlatformConnection { connected: boolean; missing: string[] }

export function platformConnection(platform: SocialPlatform): PlatformConnection {
  const missing = REQUIRED[platform].filter((k) => !process.env[k]);
  return { connected: missing.length === 0, missing };
}
