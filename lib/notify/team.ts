// Instant team alerts: in-app notification (bell) + optional WhatsApp/email to the
// alert contacts in Comms settings (or TEAM_ALERT_WHATSAPP / TEAM_ALERT_EMAIL).
// Internal messages bypass the DNC list. Never throws.
import { getDb, dbConfigured } from "@/lib/db";
import { sendWhatsApp, sendEmail } from "@/lib/messaging/send";
import { getCommsSettings } from "@/lib/comms/settings";

export interface TeamAlert { kind: string; title: string; body?: string; leadId?: number; priority?: "low" | "normal" | "high" }

export async function notifyTeam(a: TeamAlert): Promise<void> {
  try {
    if (dbConfigured()) {
      await getDb().from("notifications").insert({ kind: a.kind, title: a.title.slice(0, 200), body: (a.body ?? "").slice(0, 1000), lead_id: a.leadId ?? null, priority: a.priority ?? "normal" });
    }
    if (a.priority === "high" || a.kind === "reply") {
      const { team_alerts } = await getCommsSettings();
      const text = `${a.title}${a.body ? `\n${a.body}` : ""}`;
      if (team_alerts.whatsapp) await sendWhatsApp(team_alerts.whatsapp, text, { bypassSuppression: true });
      if (team_alerts.email) await sendEmail(team_alerts.email, a.title, (a.body ?? a.title).replace(/\n/g, "<br>"), { bypassSuppression: true, transactional: true, sentBy: "system" });
    }
  } catch (err) { console.error("[notify] notifyTeam failed:", err); }
}
