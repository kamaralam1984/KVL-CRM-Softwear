"use server";
// Phase 28 — wires Phase 24's `funnel_steps` upsell/downsell step types to an
// actual redirect. Given a funnel + the step just completed, returns the
// next step's page URL (or null if this was the last step) — called after an
// order/step completes so a checkout flow can redirect into the next
// upsell/downsell offer, the literal GHL "one-click upsell funnel" pattern.

import { getServerClient } from "@/lib/supabase/server";

export async function getNextFunnelStepUrl(funnelId: string, currentStepOrder: number): Promise<string | null> {
  try {
    const db = getServerClient();
    const { data: step, error } = await db
      .from("funnel_steps")
      .select("page_id")
      .eq("funnel_id", funnelId)
      .gt("step_order", currentStepOrder)
      .order("step_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error || !step?.page_id) return null;

    const { data: page } = await db.from("landing_pages").select("url_path").eq("id", step.page_id).maybeSingle();
    return page?.url_path ? `/p/${page.url_path}` : null;
  } catch (err) {
    console.error("[commerce] getNextFunnelStepUrl failed:", err);
    return null;
  }
}

export async function getFunnelSteps(funnelId: string): Promise<{ id: string; stepOrder: number; stepType: string; pageId: number | null }[]> {
  try {
    const db = getServerClient();
    const { data, error } = await db
      .from("funnel_steps")
      .select("*")
      .eq("funnel_id", funnelId)
      .order("step_order", { ascending: true });
    if (error || !data) return [];
    return data.map((s) => ({ id: s.id, stepOrder: s.step_order, stepType: s.step_type, pageId: s.page_id }));
  } catch (err) {
    console.error("[commerce] getFunnelSteps failed:", err);
    return [];
  }
}
