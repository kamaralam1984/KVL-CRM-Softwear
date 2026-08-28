// Phase 30 — Affiliate Manager. Reuses the existing acquisition-attribution
// stack instead of building parallel tracking: an affiliate's link is just a
// normal `?utm_source=<referral_code>` link — lib/tracking/attribution.ts
// already parses utm_source with zero changes needed. Once a visitor with
// that source identifies (Phase 17's resolveIdentity), it lands on
// `leads.source`; this module checks that column against affiliates'
// referral_code when an order completes.

import { getServerClient } from "@/lib/supabase/server";

// Called after an order is created (lib/actions/orders.ts::createOrder) —
// never blocks/throws the order flow if attribution can't be resolved.
export async function attributeOrderToAffiliate(orderId: string, customerEmail: string, amountRupees: number): Promise<void> {
  if (!customerEmail) return;
  try {
    const db = getServerClient();

    const { data: lead } = await db.from("leads").select("source").ilike("email", customerEmail).maybeSingle();
    const source = lead?.source?.trim();
    if (!source) return;

    const { data: affiliate } = await db.from("affiliates").select("id, commission_rate, status").eq("referral_code", source).maybeSingle();
    if (!affiliate || affiliate.status !== "active") return;

    const amount = amountRupees * Number(affiliate.commission_rate);
    const { error } = await db.from("affiliate_commissions").insert({ affiliate_id: affiliate.id, order_id: orderId, amount });
    if (error) console.error("[affiliates] attributeOrderToAffiliate insert failed:", error.message);
  } catch (err) {
    console.error("[affiliates] attributeOrderToAffiliate error:", err);
  }
}
