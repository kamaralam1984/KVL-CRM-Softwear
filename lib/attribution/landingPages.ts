// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 2 (Attribution Engine + Campaigns)

import { getServerClient } from "@/lib/supabase/server";

function normalizePath(urlOrPath: string): string {
  try {
    return new URL(urlOrPath).pathname || "/";
  } catch {
    return urlOrPath.split("?")[0] || "/";
  }
}

/**
 * recordLandingPageHit — increments the traffic rollup for a landing path.
 * Ensures the row exists via a race-safe upsert first (Wave 8 gap-check
 * hardening — two concurrent first-ever hits no longer risk one insert
 * throwing on the unique constraint and losing that hit entirely), then
 * always increments. The increment itself is still select-then-write, not a
 * single atomic SQL statement — under true concurrency it can rarely
 * under-count by one; a real atomic increment needs a Postgres RPC function,
 * which is a larger, separate change (documented in the roadmap).
 */
export async function recordLandingPageHit(urlOrPath: string): Promise<void> {
  try {
    const path = normalizePath(urlOrPath);
    const db = getServerClient();
    const now = new Date().toISOString();

    await db.from("landing_pages").upsert({ url_path: path, hits: 0 }, { onConflict: "url_path", ignoreDuplicates: true });

    const { data: existing } = await db.from("landing_pages").select("id, hits").eq("url_path", path).maybeSingle();
    if (existing) {
      await db
        .from("landing_pages")
        .update({ hits: existing.hits + 1, last_seen_at: now })
        .eq("id", existing.id);
    }
  } catch (err) {
    console.error("[attribution] recordLandingPageHit failed", err);
  }
}
