// Key/value comms settings (comms_settings table). Server-only helper, never throws.
import { getServerClient } from "@/lib/supabase/server";
import { DEFAULT_HOURS, type BusinessHours } from "./hours";

export interface CommsSettings {
  business_hours: BusinessHours;
  auto_reply: { enabled: boolean; offHoursText: string };
  ai_answer: { enabled: boolean };
  knowledge_base: { text: string };
  links: { paymentLink: string; bookingLink: string };
  team_alerts: { whatsapp: string; email: string };
}

export const DEFAULT_SETTINGS: CommsSettings = {
  business_hours: DEFAULT_HOURS,
  auto_reply: { enabled: true, offHoursText: "Thanks for messaging us! Our team is currently offline and will reply {{opens}}. If it's urgent, tell us here and we'll prioritise it." },
  ai_answer: { enabled: false },
  knowledge_base: { text: "" },
  links: { paymentLink: "", bookingLink: "" },
  team_alerts: { whatsapp: process.env.TEAM_ALERT_WHATSAPP ?? "", email: process.env.TEAM_ALERT_EMAIL ?? "" },
};

export async function getCommsSettings(): Promise<CommsSettings> {
  const out: CommsSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return out;
  try {
    const { data } = await getServerClient().from("comms_settings").select("key,value");
    for (const r of data ?? []) {
      if (r.key in out) (out as unknown as Record<string, unknown>)[r.key] = { ...(out as unknown as Record<string, object>)[r.key], ...(r.value as object) };
    }
  } catch (err) { console.error("[comms] getCommsSettings failed:", err); }
  return out;
}

export async function saveCommsSetting<K extends keyof CommsSettings>(key: K, value: CommsSettings[K]): Promise<boolean> {
  try {
    const { error } = await getServerClient().from("comms_settings").upsert({ key, value, updated_at: new Date().toISOString() });
    return !error;
  } catch (err) { console.error("[comms] saveCommsSetting failed:", err); return false; }
}
