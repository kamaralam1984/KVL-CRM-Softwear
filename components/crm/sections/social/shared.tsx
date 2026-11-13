"use client";
// Shared look for the Social Media pages (platform badges, palette).

import { PLATFORM_LABEL, type SocialPlatform } from "@/lib/social/validate";

export const GOLD = "#D4AF37";
export const EMERALD = "#00A86B";
export const RED = "#EF4444";
export const CARD = { background: "rgba(128,128,128,0.06)", borderColor: "rgba(128,128,128,0.18)" } as const;

export type PlatformKey = SocialPlatform;
export const PLATFORMS: PlatformKey[] = ["facebook", "instagram", "linkedin", "twitter"];
export const PLATFORM_COLOR: Record<PlatformKey, string> = { facebook: "#1877F2", instagram: "#E1306C", linkedin: "#0A66C2", twitter: "#1DA1F2" };
const PLATFORM_GLYPH: Record<PlatformKey, string> = { facebook: "f", instagram: "Ig", linkedin: "in", twitter: "X" };

// lucide v1 has no brand icons, so each platform gets a coloured badge with its own mark.
export function PlatformIcon({ platform, size = 14 }: { platform: PlatformKey; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md font-black leading-none"
      style={{ width: size + 8, height: size + 8, background: PLATFORM_COLOR[platform], color: "#fff", fontSize: Math.max(8, size - 3) }}
      aria-label={PLATFORM_LABEL[platform]}
    >
      {PLATFORM_GLYPH[platform]}
    </span>
  );
}
