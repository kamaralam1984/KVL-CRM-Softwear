// Real delivery status for outbound messages (Twilio status callback / Meta statuses).
import { getServerClient } from "@/lib/supabase/server";
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
    const db = getServerClient();
    const { data: row } = await db.from("messages").select("id,status,conversation_id,body").eq("provider_message_id", providerMessageId).maybeSingle();
    if (!row) return;
    const status = nextStatus(row.status as string, incoming);
    const patch: Record<string, unknown> = { status };
    if (incoming === "failed" && status === "failed") patch.error = error.slice(0, 300);
    if (incoming === "delivered") patch.delivered_at = new Date().toISOString();
    if (incoming === "read") patch.read_at = new Date().toISOString();
    await db.from("messages").update(patch).eq("id", row.id);

    if (status === "failed" && row.status !== "failed") {
      const { data: conv } = await db.from("conversations").select("lead_id,contact_name,contact_phone").eq("id", row.conversation_id).maybeSingle();
      await notifyTeam({ kind: "delivery_failed", priority: "high", leadId: (conv?.lead_id as number | null) ?? undefined,
        title: `Message to ${conv?.contact_name || conv?.contact_phone || "a contact"} failed`, body: `${error || "Not delivered"} — "${String(row.body ?? "").slice(0, 80)}"` });
    }
  } catch (err) { console.error("[messaging] applyDeliveryStatus failed:", err); }
}
