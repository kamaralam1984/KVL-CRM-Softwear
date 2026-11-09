// Central Do-Not-Contact list. EVERY sender in lib/messaging/send.ts checks this before
// sending, so STOP / unsubscribe / bounce / complaint on one path protects all paths
// (follow-up drip, campaigns, birthday, webinar, reminders, workflow builder).
// Fails OPEN (sends) if the DB is unreachable/unconfigured, so demo mode keeps working.

import { getServerClient } from "@/lib/supabase/server";

export type DncChannel = "whatsapp" | "sms" | "email" | "call";

/** Last 10 digits — makes "+91 98123-45678" and "919812345678" the same contact. */
export function phoneKey(phone: string | undefined | null): string {
  const d = String(phone ?? "").replace(/\D/g, "");
  return d.length >= 7 ? d.slice(-10) : "";
}
export const emailKey = (email: string | undefined | null) => String(email ?? "").trim().toLowerCase();

const dbReady = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function isSuppressed(contact: { phone?: string | null; email?: string | null }, channel: DncChannel | "all"): Promise<boolean> {
  if (!dbReady()) return false;
  const phone = phoneKey(contact.phone), email = emailKey(contact.email);
  if (!phone && !email) return false;
  try {
    const db = getServerClient();
    const ors = [phone && `phone.eq.${phone}`, email && `email.eq.${email}`].filter(Boolean).join(",");
    const { data, error } = await db.from("suppressions").select("channel").or(ors).in("channel", channel === "all" ? ["all"] : ["all", channel]).limit(1);
    if (error) { console.error("[dnc] lookup failed (sending anyway):", error.message); return false; }
    return Boolean(data?.length);
  } catch (err) { console.error("[dnc] lookup error (sending anyway):", err); return false; }
}

export async function addSuppression(contact: { phone?: string | null; email?: string | null }, opts: { channel?: "all" | DncChannel; reason?: string; source?: string } = {}): Promise<void> {
  if (!dbReady()) return;
  const phone = phoneKey(contact.phone), email = emailKey(contact.email);
  const channel = opts.channel ?? "all";
  try {
    const db = getServerClient();
    for (const row of [phone && { phone, email: "" }, email && { phone: "", email }].filter(Boolean) as { phone: string; email: string }[]) {
      // Plain insert: the unique indexes are partial, which PostgREST upsert can't target. 23505 = already listed.
      const { error } = await db.from("suppressions").insert({ ...row, channel, reason: opts.reason ?? "", source: opts.source ?? "" });
      if (error && error.code !== "23505") console.error("[dnc] add failed:", error.message);
    }
  } catch (err) { console.error("[dnc] add error:", err); }
}

export async function removeSuppression(contact: { phone?: string | null; email?: string | null }): Promise<void> {
  if (!dbReady()) return;
  const phone = phoneKey(contact.phone), email = emailKey(contact.email);
  try {
    const db = getServerClient();
    if (phone) await db.from("suppressions").delete().eq("phone", phone);
    if (email) await db.from("suppressions").delete().eq("email", email);
  } catch (err) { console.error("[dnc] remove error:", err); }
}
