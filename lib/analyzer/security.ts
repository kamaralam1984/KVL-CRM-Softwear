// AI Website Analyzer (Phase 2) — Security analyzer.
// Tests HTTPS reachability and inspects HTTP security headers.
// Never throws: on any failure returns a low-scoring, unreachable result.

import type { SecurityResult } from "./types";

const FETCH_TIMEOUT_MS = 8000;

// Points awarded per present security header (SSL is weighted separately ~40).
const HEADER_POINTS: Record<keyof SecurityResult["headers"], number> = {
  hsts: 12,
  csp: 14,
  xFrameOptions: 10,
  xContentTypeOptions: 8,
  referrerPolicy: 8,
  permissionsPolicy: 8,
};

// Header key -> [actual HTTP header name, human label for issues/missing].
const HEADER_META: Record<
  keyof SecurityResult["headers"],
  { name: string; label: string }
> = {
  hsts: { name: "strict-transport-security", label: "HSTS" },
  csp: { name: "content-security-policy", label: "CSP" },
  xFrameOptions: { name: "x-frame-options", label: "X-Frame-Options" },
  xContentTypeOptions: {
    name: "x-content-type-options",
    label: "X-Content-Type-Options",
  },
  referrerPolicy: { name: "referrer-policy", label: "Referrer-Policy" },
  permissionsPolicy: {
    name: "permissions-policy",
    label: "Permissions-Policy",
  },
};

// Normalize an arbitrary user-supplied url into an https:// origin.
function toHttpsOrigin(url: string): string {
  let raw = (url || "").trim();
  if (!raw) return "";
  // Strip any existing scheme so we can force https.
  raw = raw.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
  raw = raw.replace(/\/+$/, "");
  try {
    return new URL(`https://${raw}`).origin;
  } catch {
    return "";
  }
}

export async function analyzeSecurity(url: string): Promise<SecurityResult> {
  const headers: SecurityResult["headers"] = {};
  const missingHeaders: string[] = [];
  const issues: string[] = [];

  const origin = toHttpsOrigin(url);

  if (!origin) {
    issues.push("Invalid URL");
    issues.push("site unreachable / no SSL");
    return {
      score: 0,
      ssl: false,
      headers,
      missingHeaders: Object.values(HEADER_META).map((m) => m.label),
      issues,
    };
  }

  let ssl = false;
  let responseHeaders: Headers | null = null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(origin, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
    });
    ssl = true;
    responseHeaders = res.headers;
  } catch (err) {
    console.error("[analyzer:security]", err);
    ssl = false;
  } finally {
    clearTimeout(timer);
  }

  if (!ssl || !responseHeaders) {
    issues.push("No HTTPS");
    issues.push("site unreachable / no SSL");
    // All headers count as missing when we could not read a response.
    for (const key of Object.keys(HEADER_META) as Array<
      keyof SecurityResult["headers"]
    >) {
      missingHeaders.push(HEADER_META[key].label);
    }
    return {
      score: 5,
      ssl: false,
      headers,
      missingHeaders,
      issues,
    };
  }

  // SSL reachable — start scoring. SSL weighs most.
  let score = 40;

  for (const key of Object.keys(HEADER_META) as Array<
    keyof SecurityResult["headers"]
  >) {
    const { name, label } = HEADER_META[key];
    const present = responseHeaders.has(name);
    headers[key] = present;
    if (present) {
      score += HEADER_POINTS[key];
    } else {
      missingHeaders.push(label);
      issues.push(`Missing ${label} header`);
    }
  }

  if (score > 100) score = 100;
  if (score < 0) score = 0;

  return {
    score,
    ssl,
    headers,
    missingHeaders,
    issues,
  };
}
