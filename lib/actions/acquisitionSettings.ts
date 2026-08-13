"use server";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 7 (Campaign ROI + Admin Controls)
//
// Wave 10 — setting_key is no longer globally unique (composite with
// site_id). This Admin Panel card stays scoped to the default/KVL site only
// (matches the same call this wave made for lib/actions/intentRules.ts) —
// other sites just don't have per-site settings UI yet.
import { getServerClient } from "@/lib/supabase/server";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";

// NOTE: "use server" files may only export async functions — this stays
// module-private rather than exported (matches lib/intent/rules.ts's
// DEFAULT_RULES pattern conceptually, but can't be re-exported here).
const DEFAULT_ACQUISITION_SETTINGS: Record<string, string> = {
  tracking_enabled: "true",
  default_consent_mode: "granted",
  retention_days: "365",
  missed_call_number: "",
};

export async function getAcquisitionSettings(): Promise<Record<string, string>> {
  const db = getServerClient();
  const { data, error } = await db
    .from("acquisition_settings")
    .select("setting_key, value")
    .eq("site_id", DEFAULT_SITE_ID);

  if (error || !data?.length) return { ...DEFAULT_ACQUISITION_SETTINGS };
  const merged = { ...DEFAULT_ACQUISITION_SETTINGS };
  for (const row of data as { setting_key: string; value: string }[]) {
    merged[row.setting_key] = row.value;
  }
  return merged;
}

export async function updateAcquisitionSetting(key: string, value: string): Promise<void> {
  const db = getServerClient();
  const { error } = await db
    .from("acquisition_settings")
    .upsert({ site_id: DEFAULT_SITE_ID, setting_key: key, value }, { onConflict: "site_id,setting_key" });
  if (error) throw new Error(error.message);
}
