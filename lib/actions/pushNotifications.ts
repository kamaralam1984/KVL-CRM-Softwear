"use server";
// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 9 (Growth & Re-engagement Channels)
// Admin-triggered broadcast to anonymous Web Push subscribers. No identity is
// ever attached to a subscription (see lib/tracking/store.ts's
// recordPushSubscription) — this can only reach "some browser that opted in",
// never a named person.

import { getServerClient } from "@/lib/supabase/server";
import webpush from "web-push";

interface SubscriptionRow {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushBroadcastResult {
  configured: boolean;
  sent: number;
  failed: number;
}

function vapidConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function getPushSubscriberCount(): Promise<number> {
  try {
    const db = getServerClient();
    const { count } = await db
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .is("revoked_at", null);
    return count ?? 0;
  } catch (err) {
    console.error("[push] getPushSubscriberCount failed", err);
    return 0;
  }
}

/** sendPushBroadcast — sends the same notification to every active subscriber.
 * Self-pruning: a 404/410 send failure means the subscription is dead, so it's
 * marked revoked rather than retried on the next broadcast. */
export async function sendPushBroadcast(title: string, body: string, url: string): Promise<PushBroadcastResult> {
  if (!vapidConfigured()) return { configured: false, sent: 0, failed: 0 };

  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@kvlcrm.com",
      process.env.VAPID_PUBLIC_KEY as string,
      process.env.VAPID_PRIVATE_KEY as string
    );

    const db = getServerClient();
    const { data } = await db
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .is("revoked_at", null);
    const subs = (data as SubscriptionRow[] | null) ?? [];

    const payload = JSON.stringify({ title, body, url: url || "/" });
    let sent = 0;
    let failed = 0;

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
          sent += 1;
        } catch (err) {
          failed += 1;
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await db.from("push_subscriptions").update({ revoked_at: new Date().toISOString() }).eq("id", s.id);
          }
        }
      })
    );

    return { configured: true, sent, failed };
  } catch (err) {
    console.error("[push] sendPushBroadcast failed", err);
    return { configured: true, sent: 0, failed: 0 };
  }
}
