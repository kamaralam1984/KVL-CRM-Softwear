// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 10 (Multi-Tenant Embed)
// Shared site resolution + CORS helpers applied to every public
// analytics/telephony route — factored once so the same validation and
// header logic isn't hand-repeated per route.

import { NextRequest, NextResponse } from "next/server";
import { getSiteBySiteId, DEFAULT_SITE_ID } from "./store";
import type { Site } from "./types";

// Accepts either the runtime-generated format (KVL-SITE-<hex>, from
// lib/sites/store.ts's generateSiteId()) or a readable kebab-case slug — for
// permanently-seeded sites like 'kvl-default' or a named client site added
// directly in schema.sql, not just ones created ad-hoc via the Admin Panel.
const SITE_ID_PATTERN = /^([a-z][a-z0-9-]{2,48}|KVL-SITE-[A-F0-9]{6,32})$/;

export function isValidSiteId(value: unknown): value is string {
  return typeof value === "string" && SITE_ID_PATTERN.test(value);
}

/** Empty `domains` (only true for the bootstrap site) means unrestricted —
 * it's served same-origin from this app, not embedded on a third-party page. */
export function isOriginAllowed(site: Site, origin: string | null): boolean {
  if (!site.domains || site.domains.length === 0) return true;
  if (!origin) return false;
  return site.domains.includes(origin);
}

export function corsHeaders(origin: string | null): HeadersInit {
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export function corsPreflight(req: NextRequest): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

/** Shorthand used by every route below so `headers: corsHeaders(origin)` isn't repeated per response. */
export function jsonWithCors(origin: string | null, body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: corsHeaders(origin) });
}

/**
 * Validates the incoming site_id (defaulting to the bootstrap site when
 * missing — keeps pre-Wave-10 SDK payloads working), looks up the site, and
 * enforces the Origin allow-list. Returns either the resolved site or a
 * ready-to-return error NextResponse (already carrying CORS headers).
 */
export async function resolveSiteFromRequest(
  req: NextRequest,
  siteIdInput: unknown
): Promise<{ site: Site } | { error: NextResponse }> {
  const origin = req.headers.get("origin");
  const raw = typeof siteIdInput === "string" && siteIdInput.trim() ? siteIdInput.trim() : DEFAULT_SITE_ID;

  if (!isValidSiteId(raw)) {
    return { error: NextResponse.json({ ok: false, error: "invalid_site_id" }, { status: 400, headers: corsHeaders(origin) }) };
  }

  const site = await getSiteBySiteId(raw);
  if (!site || !site.active) {
    return { error: NextResponse.json({ ok: false, error: "unknown_site" }, { status: 404, headers: corsHeaders(origin) }) };
  }
  if (!isOriginAllowed(site, origin)) {
    return { error: NextResponse.json({ ok: false, error: "origin_not_allowed" }, { status: 403, headers: corsHeaders(origin) }) };
  }

  return { site };
}
