"use server";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 7 (Campaign ROI + Admin Controls)
import { getServerClient } from "@/lib/supabase/server";

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
  const { data, error } = await db.from("acquisition_settings").select("setting_key, value");

  if (error || !data?.length) return { ...DEFAULT_ACQUISITION_SETTINGS };
  const merged = { ...DEFAULT_ACQUISITION_SETTINGS };
  for (const row of data as { setting_key: string; value: string }[]) {
    merged[row.setting_key] = row.value;
  }
  return merged;
}

export async function updateAcquisitionSetting(key: string, value: string): Promise<void> {
  const db = getServerClient();
  const { error } = await db.from("acquisition_settings").upsert({ setting_key: key, value }, { onConflict: "setting_key" });
  if (error) throw new Error(error.message);
}
