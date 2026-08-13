// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 1 (Foundation)
// Server-only persistence helpers used by app/api/analytics/* route handlers.
// Every function fails soft (never throws) — a tracking write must never
// break the visitor's page or bubble a 500 back to a real browser.

import { getServerClient } from "@/lib/supabase/server";
import type { AttributionParams, DeviceContext } from "./types";

function log(where: string, err: unknown) {
  console.error(`[tracking] ${where} failed`, err);
}

interface VisitorRow {
  visitor_id: string;
  first_touch_source: string;
  first_touch_medium: string;
  first_touch_campaign: string;
  first_touch_term: string;
  first_touch_content: string;
  first_touch_gclid: string;
  first_touch_fbclid: string;
  first_touch_msclkid: string;
  session_count: number;
  page_views: number;
  last_seen_at: string;
}

// Wave 10 gap-check hardening — scoped by site_id, not just visitor_id.
// visitor_id/session_id stay globally unique by construction (random hex,
// collision-free), but that only guards against accidental reuse — it never
// verified the caller's own site actually owns the row before writing to it.
// A different site presenting a visitor_id it doesn't own (leaked, sniffed,
// or otherwise obtained) could previously still mutate that row. Filtering
// every read-modify-write by site_id closes that: a mismatched site_id now
// makes `existing` come back null, and the write is skipped entirely.
async function getVisitorRow(visitorId: string, siteId: string): Promise<VisitorRow | null> {
  const db = getServerClient();
  const { data } = await db
    .from("visitors")
    .select(
      "visitor_id, first_touch_source, first_touch_medium, first_touch_campaign, first_touch_term, first_touch_content, first_touch_gclid, first_touch_fbclid, first_touch_msclkid, session_count, page_views, last_seen_at"
    )
    .eq("visitor_id", visitorId)
    .eq("site_id", siteId)
    .maybeSingle();
  return (data as VisitorRow | null) ?? null;
}

/**
 * Ensures a visitor row exists; bumps page_views/last_seen_at either way.
 * Row-creation uses a race-safe upsert (Wave 8 gap-check hardening) — a
 * concurrent create no longer risks one request's insert throwing on the
 * unique constraint and losing that request's page-view entirely.
 */
export async function upsertVisitor(
  input: {
    visitorId: string;
    pageViewIncrement?: number;
    referrer?: string;
    landingPage?: string;
    device?: Partial<DeviceContext>;
  },
  siteId: string
): Promise<void> {
  try {
    const db = getServerClient();
    const increment = input.pageViewIncrement ?? 0;

    await db.from("visitors").upsert(
      {
        visitor_id: input.visitorId,
        site_id: siteId,
        referrer: input.referrer ?? "",
        landing_page: input.landingPage ?? "",
        device: input.device?.device ?? "",
        browser: input.device?.browser ?? "",
        os: input.device?.os ?? "",
        language: input.device?.language ?? "",
        timezone: input.device?.timezone ?? "",
      },
      { onConflict: "visitor_id", ignoreDuplicates: true }
    );

    const existing = await getVisitorRow(input.visitorId, siteId);
    if (existing) {
      await db
        .from("visitors")
        .update({
          page_views: existing.page_views + increment,
          last_seen_at: new Date().toISOString(),
        })
        .eq("visitor_id", input.visitorId)
        .eq("site_id", siteId);
    }
  } catch (err) {
    log("upsertVisitor", err);
  }
}

/**
 * recordSessionStart — creates the session row and applies attribution to the
 * parent visitor: first_touch_* is set only once (never overwritten), last_touch_*
 * is always refreshed. Implements spec §3's first/last-touch persistence rule.
 *
 * Row-creation is a race-safe upsert (Wave 8 gap-check hardening) — a
 * concurrent first-ever session for the same brand-new visitor no longer
 * risks one request's insert throwing on the unique constraint. "Is this
 * visitor's first-ever session" is then determined from session_count
 * (0 before this call) rather than "did an insert vs. update happen",
 * since after the upsert a row always exists either way.
 */
export async function recordSessionStart(
  input: {
    sessionId: string;
    visitorId: string;
    landingPage: string;
    attribution: AttributionParams;
    device: Partial<DeviceContext>;
  },
  siteId: string
): Promise<{ isReturning: boolean; previousLastSeenAt: string | null }> {
  try {
    const db = getServerClient();
    const now = new Date().toISOString();
    const a = input.attribution;

    // Ensure the row exists, seeding first_touch_*/last_touch_* if this is a
    // brand-new visitor. Skipped silently (ignoreDuplicates) if another
    // concurrent request already created it — that row's first_touch_* is
    // left untouched, exactly as the read-modify-write path below requires.
    await db.from("visitors").upsert(
      {
        visitor_id: input.visitorId,
        site_id: siteId,
        landing_page: input.landingPage,
        device: input.device.device ?? "",
        browser: input.device.browser ?? "",
        os: input.device.os ?? "",
        language: input.device.language ?? "",
        timezone: input.device.timezone ?? "",
        first_touch_source: a.source,
        first_touch_medium: a.medium,
        first_touch_campaign: a.campaign,
        first_touch_term: a.term,
        first_touch_content: a.content,
        first_touch_gclid: a.gclid,
        first_touch_fbclid: a.fbclid,
        first_touch_msclkid: a.msclkid,
        last_touch_source: a.source,
        last_touch_medium: a.medium,
        last_touch_campaign: a.campaign,
        last_touch_term: a.term,
        last_touch_content: a.content,
        last_touch_gclid: a.gclid,
        last_touch_fbclid: a.fbclid,
        last_touch_msclkid: a.msclkid,
      },
      { onConflict: "visitor_id", ignoreDuplicates: true }
    );

    const existing = await getVisitorRow(input.visitorId, siteId);
    const isReturning = (existing?.session_count ?? 0) > 0;
    const previousLastSeenAt = isReturning ? (existing?.last_seen_at ?? null) : null;

    if (existing) {
      const firstTouchPatch = !existing.first_touch_source
        ? {
            first_touch_source: a.source,
            first_touch_medium: a.medium,
            first_touch_campaign: a.campaign,
            first_touch_term: a.term,
            first_touch_content: a.content,
            first_touch_gclid: a.gclid,
            first_touch_fbclid: a.fbclid,
            first_touch_msclkid: a.msclkid,
          }
        : {};

      await db
        .from("visitors")
        .update({
          ...firstTouchPatch,
          last_touch_source: a.source,
          last_touch_medium: a.medium,
          last_touch_campaign: a.campaign,
          last_touch_term: a.term,
          last_touch_content: a.content,
          last_touch_gclid: a.gclid,
          last_touch_fbclid: a.fbclid,
          last_touch_msclkid: a.msclkid,
          last_seen_at: now,
          session_count: existing.session_count + 1,
        })
        .eq("visitor_id", input.visitorId)
        .eq("site_id", siteId);
    }

    await db.from("visitor_sessions").insert({
      session_id: input.sessionId,
      visitor_id: input.visitorId,
      site_id: siteId,
      landing_page: input.landingPage,
      source: a.source,
      medium: a.medium,
      campaign: a.campaign,
      term: a.term,
      content: a.content,
      gclid: a.gclid,
      fbclid: a.fbclid,
      msclkid: a.msclkid,
      device: input.device.device ?? "",
      browser: input.device.browser ?? "",
      os: input.device.os ?? "",
    });

    return { isReturning, previousLastSeenAt };
  } catch (err) {
    log("recordSessionStart", err);
    return { isReturning: false, previousLastSeenAt: null };
  }
}

export async function recordSessionEnd(
  input: {
    sessionId: string;
    exitPage?: string;
    durationSeconds?: number;
    pagesViewed?: number;
  },
  siteId: string
): Promise<void> {
  try {
    const db = getServerClient();
    await db
      .from("visitor_sessions")
      .update({
        ended_at: new Date().toISOString(),
        exit_page: input.exitPage ?? "",
        duration_seconds: input.durationSeconds ?? 0,
        pages_viewed: input.pagesViewed ?? 0,
      })
      .eq("session_id", input.sessionId)
      .eq("site_id", siteId);
  } catch (err) {
    log("recordSessionEnd", err);
  }
}

export async function recordEvents(
  events: Array<{
    visitorId: string;
    sessionId: string | null;
    eventName: string;
    pageUrl: string;
    properties: Record<string, unknown>;
  }>,
  siteId: string
): Promise<void> {
  if (!events.length) return;
  try {
    const db = getServerClient();
    await db.from("visitor_events").insert(
      events.map((e) => ({
        visitor_id: e.visitorId,
        session_id: e.sessionId,
        site_id: siteId,
        event_name: e.eventName,
        page_url: e.pageUrl,
        properties: e.properties,
      }))
    );
  } catch (err) {
    log("recordEvents", err);
  }
}

export async function markVisitorIdentified(visitorId: string, siteId: string): Promise<void> {
  try {
    const db = getServerClient();
    await db.from("visitors").update({ identified: true }).eq("visitor_id", visitorId).eq("site_id", siteId);
  } catch (err) {
    log("markVisitorIdentified", err);
  }
}

/**
 * getVisitorAttribution — source/campaign to carry onto a newly auto-created
 * lead (Wave 3 identity resolution). Prefers first-touch; falls back to
 * last-touch if first-touch is somehow empty.
 */
export async function getVisitorAttribution(visitorId: string, siteId: string): Promise<{ source: string; campaign: string } | null> {
  try {
    const db = getServerClient();
    const { data } = await db
      .from("visitors")
      .select("first_touch_source, first_touch_campaign, last_touch_source, last_touch_campaign")
      .eq("visitor_id", visitorId)
      .eq("site_id", siteId)
      .maybeSingle();
    if (!data) return null;
    return {
      source: data.first_touch_source || data.last_touch_source || "",
      campaign: data.first_touch_campaign || data.last_touch_campaign || "",
    };
  } catch (err) {
    log("getVisitorAttribution", err);
    return null;
  }
}

/**
 * recordPushSubscription — persists a Web Push subscription tied only to
 * visitor_id (Wave 9). Deliberately collects no name/email/phone — the whole
 * point of this channel is re-reaching a visitor without ever identifying
 * them. Upsert on endpoint (the subscription's own unique key) so a repeat
 * subscribe from the same browser/session is idempotent, not a duplicate row.
 */
export async function recordPushSubscription(
  input: {
    visitorId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  siteId: string
): Promise<void> {
  try {
    const db = getServerClient();
    await db.from("push_subscriptions").upsert(
      { visitor_id: input.visitorId, site_id: siteId, endpoint: input.endpoint, p256dh: input.p256dh, auth: input.auth, revoked_at: null },
      { onConflict: "endpoint" }
    );
  } catch (err) {
    log("recordPushSubscription", err);
  }
}

export async function recordConsent(
  input: {
    visitorId: string;
    status: "granted" | "denied";
    categories: Record<string, unknown>;
  },
  siteId: string
): Promise<void> {
  try {
    const db = getServerClient();
    await db.from("tracking_consents").insert({
      visitor_id: input.visitorId,
      site_id: siteId,
      consent_status: input.status,
      categories: input.categories,
    });
    await db.from("visitors").update({ consent_status: input.status }).eq("visitor_id", input.visitorId).eq("site_id", siteId);
  } catch (err) {
    log("recordConsent", err);
  }
}
