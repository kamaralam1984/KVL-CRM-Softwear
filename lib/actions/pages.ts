"use server";
// Phase 24 — Funnel / Landing-Page Drag-Drop Builder. CRUD for `landing_pages`
// (Wave 2's traffic-only table, additively extended with authoring fields —
// see lib/supabase/schema.sql) and `funnels`/`funnel_steps`.

import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";
import type { PlacedBlock } from "@/lib/pages/blocks";

export type PageStatus = "draft" | "published" | "paused";

export type PageRow = {
  id: number;
  site_id: string;
  name: string;
  url_path: string;
  status: PageStatus;
  template: string;
  blocks: PlacedBlock[];
  hits: number;
  updated_at: string;
};

export async function getPages(siteId = DEFAULT_SITE_ID, accessToken?: string): Promise<PageRow[]> {
  if (!(await assertCan(accessToken, "funnels", "read"))) return [];
  try {
    const db = getServerClient();
    const { data, error } = await db
      .from("landing_pages")
      .select("*")
      .eq("site_id", siteId)
      .order("updated_at", { ascending: false });
    if (error) { console.error("[pages] getPages failed:", error.message); return []; }
    return (data ?? []) as PageRow[];
  } catch (err) {
    console.error("[pages] getPages error:", err);
    return [];
  }
}

// Public — used by the rendered page route, no RBAC (same trust model as any
// other public marketing page).
export async function getPageBySlug(slug: string, siteId = DEFAULT_SITE_ID): Promise<PageRow | null> {
  try {
    const db = getServerClient();
    const { data, error } = await db
      .from("landing_pages")
      .select("*")
      .eq("site_id", siteId)
      .eq("url_path", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error || !data) return null;
    return data as PageRow;
  } catch (err) {
    console.error("[pages] getPageBySlug failed:", err);
    return null;
  }
}

export async function savePage(
  input: { id?: number; name: string; urlPath: string; template: string; blocks: PlacedBlock[]; siteId?: string },
  accessToken?: string,
): Promise<PageRow | null> {
  if (!(await assertCan(accessToken, "funnels", input.id ? "update" : "create"))) return null;
  const siteId = input.siteId ?? DEFAULT_SITE_ID;

  try {
    const db = getServerClient();
    if (input.id) {
      const { data, error } = await db
        .from("landing_pages")
        .update({ name: input.name, template: input.template, blocks: input.blocks })
        .eq("id", input.id)
        .select()
        .single();
      if (error) { console.error("[pages] savePage update failed:", error.message); return null; }
      return data as PageRow;
    }
    const { data, error } = await db
      .from("landing_pages")
      .upsert(
        { site_id: siteId, url_path: input.urlPath, name: input.name, template: input.template, blocks: input.blocks, status: "draft" },
        { onConflict: "site_id,url_path" },
      )
      .select()
      .single();
    if (error) { console.error("[pages] savePage insert failed:", error.message); return null; }
    return data as PageRow;
  } catch (err) {
    console.error("[pages] savePage error:", err);
    return null;
  }
}

export async function publishPage(id: number, accessToken?: string): Promise<{ ok: boolean }> {
  if (!(await assertCan(accessToken, "funnels", "update"))) return { ok: false };
  try {
    const db = getServerClient();
    const { error } = await db.from("landing_pages").update({ status: "published" }).eq("id", id);
    if (error) { console.error("[pages] publishPage failed:", error.message); return { ok: false }; }
    return { ok: true };
  } catch (err) {
    console.error("[pages] publishPage error:", err);
    return { ok: false };
  }
}

export async function duplicatePage(id: number, accessToken?: string): Promise<PageRow | null> {
  if (!(await assertCan(accessToken, "funnels", "create"))) return null;
  try {
    const db = getServerClient();
    const { data: src, error: fetchErr } = await db.from("landing_pages").select("*").eq("id", id).single();
    if (fetchErr || !src) return null;
    const { data, error } = await db
      .from("landing_pages")
      .insert({
        site_id: src.site_id,
        url_path: `${src.url_path}-copy-${Date.now().toString(36)}`,
        name: `${src.name} (Copy)`,
        template: src.template,
        blocks: src.blocks,
        status: "draft",
      })
      .select()
      .single();
    if (error) { console.error("[pages] duplicatePage failed:", error.message); return null; }
    return data as PageRow;
  } catch (err) {
    console.error("[pages] duplicatePage error:", err);
    return null;
  }
}

export async function deletePage(id: number, accessToken?: string): Promise<{ ok: boolean }> {
  if (!(await assertCan(accessToken, "funnels", "delete"))) return { ok: false };
  try {
    const db = getServerClient();
    const { error } = await db.from("landing_pages").delete().eq("id", id);
    if (error) { console.error("[pages] deletePage failed:", error.message); return { ok: false }; }
    return { ok: true };
  } catch (err) {
    console.error("[pages] deletePage error:", err);
    return { ok: false };
  }
}

// Called by the public render route on every view. Non-atomic
// read-then-write increment — same documented residual-risk pattern as this
// codebase's other counters (docs/ACQUISITION_ENGINE_ROADMAP.md §4c).
export async function recordPageHit(slug: string, siteId = DEFAULT_SITE_ID): Promise<void> {
  try {
    const db = getServerClient();
    const { data } = await db.from("landing_pages").select("hits").eq("site_id", siteId).eq("url_path", slug).maybeSingle();
    if (data) {
      await db.from("landing_pages").update({ hits: (data.hits ?? 0) + 1 }).eq("site_id", siteId).eq("url_path", slug);
    }
  } catch (err) {
    console.error("[pages] recordPageHit failed:", err);
  }
}
