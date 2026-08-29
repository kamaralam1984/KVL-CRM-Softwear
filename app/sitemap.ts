import type { MetadataRoute } from "next";

const BASE_URL = "https://maxness.kvlbusinesssolutions.com";

// Only the static marketing pages — /forms/[slug], /webinar/[slug], /p/[slug]
// etc. are per-tenant dynamic content with no fixed URL list to enumerate.
const STATIC_ROUTES = ["", "/features", "/pricing", "/contact", "/privacy", "/terms", "/quiz"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return STATIC_ROUTES.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified,
  }));
}
