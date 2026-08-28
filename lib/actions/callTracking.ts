"use server";
// Phase 41 — Call Tracking (Dynamic Number Insertion). CRUD for
// `tracking_numbers`/`call_logs` + the provisioning action the UI calls.

import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";
import { provisionTrackingNumber, isTwilioNumberProvisioningConfigured } from "@/lib/telephony/numbers";

// Gap-check fix: isTwilioNumberProvisioningConfigured reads process.env
// directly, so it can never be imported into a "use client" component
// (env vars resolve undefined there — the exact leak-bug class this
// codebase guards against). This thin server-action wrapper is the safe
// boundary Marketing.tsx's CallTrackingTab calls instead, to show a
// "Twilio configured?" badge before the user tries provisioning a number.
export async function isTelephonyConfigured(): Promise<boolean> {
  return isTwilioNumberProvisioningConfigured();
}

export type TrackingNumber = {
  id: string;
  site_id: string;
  phone_number: string;
  twilio_sid: string;
  campaign_id: number | null;
  campaign_name: string;
  forward_to_number: string;
  created_at: string;
};

export type CallLog = {
  id: string;
  tracking_number_id: string | null;
  from_number: string;
  direction: "inbound" | "outbound";
  status: string;
  duration_seconds: number | null;
  recording_url: string;
  campaign_id: number | null;
  provider_call_sid: string;
  is_ai_call: boolean;
  created_at: string;
};

export async function getTrackingNumbers(siteId = DEFAULT_SITE_ID, accessToken?: string): Promise<TrackingNumber[]> {
  if (!(await assertCan(accessToken, "marketing", "read"))) return [];
  try {
    const db = getServerClient();
    const { data, error } = await db.from("tracking_numbers").select("*").eq("site_id", siteId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as TrackingNumber[];
  } catch (err) {
    console.error("[telephony] getTrackingNumbers error:", err);
    return [];
  }
}

// `appBaseUrl` comes from the client (window.location.origin) — server
// actions have no reliable way to know their own public URL otherwise, same
// pattern lib/actions/integrations.ts's getRazorpayConnectUrl uses.
export async function createTrackingNumber(
  input: { areaCode: string; campaignName: string; forwardToNumber: string; appBaseUrl: string; siteId?: string },
  accessToken?: string,
): Promise<{ ok: boolean; mock: boolean }> {
  if (!(await assertCan(accessToken, "marketing", "create"))) return { ok: false, mock: false };
  try {
    const result = await provisionTrackingNumber(input.areaCode, input.appBaseUrl);
    if (!result.ok || !result.phoneNumber) return { ok: false, mock: result.mock };

    const db = getServerClient();
    const siteId = input.siteId ?? DEFAULT_SITE_ID;

    let campaignId: number | null = null;
    if (input.campaignName.trim()) {
      const key = `phone:${input.campaignName.trim().toLowerCase().replace(/\s+/g, "-")}`;
      const { data: campaign } = await db
        .from("campaigns")
        .upsert({ site_id: siteId, campaign_key: key, name: input.campaignName.trim(), source: "call_tracking", medium: "phone" }, { onConflict: "site_id,campaign_key" })
        .select("id")
        .single();
      campaignId = campaign?.id ?? null;
    }

    const { error } = await db.from("tracking_numbers").insert({
      site_id: siteId,
      phone_number: result.phoneNumber,
      twilio_sid: result.twilioSid ?? "",
      campaign_id: campaignId,
      campaign_name: input.campaignName.trim(),
      forward_to_number: input.forwardToNumber,
    });
    if (error) { console.error("[telephony] createTrackingNumber save failed:", error.message); return { ok: false, mock: result.mock }; }
    return { ok: true, mock: result.mock };
  } catch (err) {
    console.error("[telephony] createTrackingNumber error:", err);
    return { ok: false, mock: false };
  }
}

export async function deleteTrackingNumber(id: string, accessToken?: string): Promise<{ ok: boolean }> {
  if (!(await assertCan(accessToken, "marketing", "delete"))) return { ok: false };
  try {
    const db = getServerClient();
    const { error } = await db.from("tracking_numbers").delete().eq("id", id);
    if (error) return { ok: false };
    return { ok: true };
  } catch (err) {
    console.error("[telephony] deleteTrackingNumber error:", err);
    return { ok: false };
  }
}

export async function getCallLogs(siteId = DEFAULT_SITE_ID, accessToken?: string): Promise<CallLog[]> {
  if (!(await assertCan(accessToken, "marketing", "read"))) return [];
  try {
    const db = getServerClient();
    const { data: numbers } = await db.from("tracking_numbers").select("id").eq("site_id", siteId);
    const ids = (numbers ?? []).map((n) => n.id);
    if (!ids.length) return [];
    const { data, error } = await db.from("call_logs").select("*").in("tracking_number_id", ids).order("created_at", { ascending: false }).limit(100);
    if (error) return [];
    return (data ?? []) as CallLog[];
  } catch (err) {
    console.error("[telephony] getCallLogs error:", err);
    return [];
  }
}
