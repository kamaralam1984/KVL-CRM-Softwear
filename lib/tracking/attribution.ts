// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 1 (Foundation)
// UTM + click-id extraction and referrer-based source/medium inference.
// Spec §3: capture whatever attribution parameters are available; never invent them.

import type { AttributionParams } from "./types";

const SEARCH_ENGINES = ["google", "bing", "yahoo", "duckduckgo", "baidu", "yandex"];
const SOCIAL_NETWORKS = ["facebook", "instagram", "linkedin", "twitter", "x.com", "pinterest", "tiktok"];

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Infers source/medium from the referring domain when no UTM/click-id is present. */
function inferFromReferrer(referrer: string, currentHost: string): { source: string; medium: string } {
  if (!referrer) return { source: "direct", medium: "none" };
  const refHost = hostnameOf(referrer);
  if (!refHost || refHost === currentHost) return { source: "direct", medium: "none" };
  if (SEARCH_ENGINES.some((s) => refHost.includes(s))) return { source: refHost, medium: "organic" };
  if (SOCIAL_NETWORKS.some((s) => refHost.includes(s))) return { source: refHost, medium: "organic_social" };
  return { source: refHost, medium: "referral" };
}

/**
 * parseAttribution — extract UTM params + click IDs from a page URL, falling
 * back to referrer-based inference (organic search / organic social / referral
 * / direct) when no explicit campaign params are present.
 */
export function parseAttribution(pageUrl: string, referrer: string, currentHost: string): AttributionParams {
  let params: URLSearchParams;
  try {
    params = new URL(pageUrl).searchParams;
  } catch {
    params = new URLSearchParams();
  }

  const gclid = params.get("gclid") ?? "";
  const fbclid = params.get("fbclid") ?? "";
  const msclkid = params.get("msclkid") ?? "";
  const utmSource = params.get("utm_source") ?? "";
  const utmMedium = params.get("utm_medium") ?? "";

  let source = utmSource;
  let medium = utmMedium;

  if (!source) {
    if (gclid) { source = "google"; medium = medium || "cpc"; }
    else if (fbclid) { source = "facebook"; medium = medium || "paid_social"; }
    else if (msclkid) { source = "bing"; medium = medium || "cpc"; }
    else {
      const inferred = inferFromReferrer(referrer, currentHost);
      source = inferred.source;
      medium = medium || inferred.medium;
    }
  }

  return {
    source,
    medium: medium || "none",
    campaign: params.get("utm_campaign") ?? "",
    term: params.get("utm_term") ?? "",
    content: params.get("utm_content") ?? "",
    gclid,
    fbclid,
    msclkid,
  };
}
