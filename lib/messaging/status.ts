// Real delivery status for outbound messages (Twilio status callback / Meta statuses).
import { getDb } from "@/lib/db";
import { notifyTeam } from "@/lib/notify/team";

export type DeliveryStatus = "queued" | "sent" | "delivered" | "read" | "failed";
const RANK: Record<string, number> = { mock: 0, queued: 0, sent: 1, delivered: 2, read: 3 };

/** Never downgrade (read can't go back to delivered); failed only overrides queued/sent. */
export function nextStatus(current: string | null | undefined, incoming: DeliveryStatus): string {
  const cur = current ?? "sent";
  if (incoming === "failed") return (RANK[cur] ?? 0) >= 2 ? cur : "failed";
  if (cur === "failed") return incoming;
  return (RANK[incoming] ?? 0) >= (RANK[cur] ?? 0) ? incoming : cur;
}

export function mapTwilioStatus(s: string): DeliveryStatus | null {
  switch (s.toLowerCase()) {
    case "queued": case "accepted": case "sending": case "scheduled": return "queued";
    case "sent": return "sent";
    case "delivered": return "delivered";
    case "read": return "read";
    case "failed": case "undelivered": case "canceled": return "failed";
    default: return null;
  }
}

export async function applyDeliveryStatus(providerMessageId: string, incoming: DeliveryStatus, error = ""): Promise<void> {
  if (!providerMessageId) return;
  try {
    const db = getDb();
    await applyBroadcastRecipientStatus(providerMessageId, incoming, error);
    const { data: row } = await db.from("messages").select("id,status,conversation_id,body,sent_by").eq("provider_message_id", providerMessageId).maybeSingle();
    if (!row) return;
    const status = nextStatus(row.status as string, incoming);
    const patch: Record<string, unknown> = { status };
    if (incoming === "failed" && status === "failed") patch.error = error.slice(0, 300);
    if (incoming === "delivered") patch.delivered_at = new Date().toISOString();
    if (incoming === "read") patch.read_at = new Date().toISOString();
    await db.from("messages").update(patch).eq("id", row.id);

    // A failed bulk-broadcast message is shown in the broadcast report — don't spam the team with one alert each.
    if (status === "failed" && row.status !== "failed" && row.sent_by !== "broadcast") {
      const { data: conv } = await db.from("conversations").select("lead_id,contact_name,contact_phone").eq("id", row.conversation_id).maybeSingle();
      await notifyTeam({ kind: "delivery_failed", priority: "high", leadId: (conv?.lead_id as number | null) ?? undefined,
        title: `Message to ${conv?.contact_name || conv?.contact_phone || "a contact"} failed`, body: `${error || "Not delivered"} — "${String(row.body ?? "").slice(0, 80)}"` });
    }
  } catch (err) { console.error("[messaging] applyDeliveryStatus failed:", err); }
}

/** Mirrors Meta/Twilio delivery receipts onto the broadcast recipient (sent → delivered → read / failed). */
async function applyBroadcastRecipientStatus(providerMessageId: string, incoming: DeliveryStatus, error: string): Promise<void> {
  try {
    const db = getDb();
    const { data: r } = await db.from("wa_broadcast_recipients").select("id,status").eq("provider_message_id", providerMessageId).maybeSingle();
    if (!r) return;
    const status = nextStatus(r.status as string, incoming);
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status };
    if (status === "failed") patch.error = (error || "Not delivered").slice(0, 300);
    if (incoming === "delivered") patch.delivered_at = now;
    if (incoming === "read") { patch.read_at = now; patch.delivered_at = now; }
    await db.from("wa_broadcast_recipients").update(patch).eq("id", r.id);
  } catch (err) { console.error("[messaging] broadcast recipient status failed:", err); }
}
