"use server";
// Phase 37 — SMS DLT-Compliant Template Scaffolding. CRUD for `sms_templates`
// + the lookup lib/messaging/send.ts::sendSms uses to log which approved
// DLT template an outbound SMS was sent under.

import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";

export type SmsTemplate = {
  id: string;
  site_id: string;
  template_key: string;
  dlt_entity_id: string;
  dlt_template_id: string;
  content: string;
  approved: boolean;
  created_at: string;
};

export async function getSmsTemplates(siteId = DEFAULT_SITE_ID, accessToken?: string): Promise<SmsTemplate[]> {
  if (!(await assertCan(accessToken, "marketing", "read"))) return [];
  try {
    const db = getServerClient();
    const { data, error } = await db.from("sms_templates").select("*").eq("site_id", siteId).order("template_key");
    if (error) { console.error("[messaging] getSmsTemplates failed:", error.message); return []; }
    return (data ?? []) as SmsTemplate[];
  } catch (err) {
    console.error("[messaging] getSmsTemplates error:", err);
    return [];
  }
}

// Upsert by (site_id, template_key) — the Settings "DLT Templates" tab calls
// this once the user has an approved entity/template ID from their carrier's
// DLT portal to paste in.
export async function saveSmsTemplate(
  input: { templateKey: string; dltEntityId: string; dltTemplateId: string; content: string; approved: boolean; siteId?: string },
  accessToken?: string,
): Promise<{ ok: boolean }> {
  if (!(await assertCan(accessToken, "marketing", "update"))) return { ok: false };
  try {
    const db = getServerClient();
    const { error } = await db.from("sms_templates").upsert(
      {
        site_id: input.siteId ?? DEFAULT_SITE_ID,
        template_key: input.templateKey,
        dlt_entity_id: input.dltEntityId,
        dlt_template_id: input.dltTemplateId,
        content: input.content,
        approved: input.approved,
      },
      { onConflict: "site_id,template_key" },
    );
    if (error) { console.error("[messaging] saveSmsTemplate failed:", error.message); return { ok: false }; }
    return { ok: true };
  } catch (err) {
    console.error("[messaging] saveSmsTemplate error:", err);
    return { ok: false };
  }
}

// Called by lib/messaging/send.ts (server-only, no RBAC gate needed — it's
// an internal lookup, not a user-facing action) to find an approved template
// for audit-trail logging. Returns null on any miss, never throws.
export async function findApprovedSmsTemplate(templateKey: string, siteId = DEFAULT_SITE_ID): Promise<SmsTemplate | null> {
  try {
    const db = getServerClient();
    const { data, error } = await db
      .from("sms_templates")
      .select("*")
      .eq("site_id", siteId)
      .eq("template_key", templateKey)
      .eq("approved", true)
      .maybeSingle();
    if (error || !data) return null;
    return data as SmsTemplate;
  } catch (err) {
    console.error("[messaging] findApprovedSmsTemplate error:", err);
    return null;
  }
}
