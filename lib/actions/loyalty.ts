"use server";
// Phase 28 — Commerce Suite II. Append-only loyalty-points ledger — balance
// is sum(points) per customer, computed on read, not a mutable column. Gives
// free audit history (every award/redemption is its own row) for no extra work.

import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";

export type LoyaltyEntry = {
  id: string;
  customer_id: number;
  points: number;
  reason: string;
  order_id: string | null;
  created_at: string;
};

export async function awardPoints(
  customerId: number,
  points: number,
  reason: string,
  orderId?: string,
  accessToken?: string,
): Promise<{ ok: boolean }> {
  if (!(await assertCan(accessToken, "commerce", "create"))) return { ok: false };
  try {
    const db = getServerClient();
    const { error } = await db.from("loyalty_points").insert({ customer_id: customerId, points, reason, order_id: orderId ?? null });
    if (error) { console.error("[commerce] awardPoints failed:", error.message); return { ok: false }; }
    return { ok: true };
  } catch (err) {
    console.error("[commerce] awardPoints error:", err);
    return { ok: false };
  }
}

export async function getLoyaltyBalance(customerId: number, accessToken?: string): Promise<number> {
  if (!(await assertCan(accessToken, "commerce", "read"))) return 0;
  try {
    const db = getServerClient();
    const { data, error } = await db.from("loyalty_points").select("points").eq("customer_id", customerId);
    if (error || !data) return 0;
    return data.reduce((sum, row) => sum + Number(row.points), 0);
  } catch (err) {
    console.error("[commerce] getLoyaltyBalance error:", err);
    return 0;
  }
}

export async function getLoyaltyLedger(customerId: number, accessToken?: string): Promise<LoyaltyEntry[]> {
  if (!(await assertCan(accessToken, "commerce", "read"))) return [];
  try {
    const db = getServerClient();
    const { data, error } = await db.from("loyalty_points").select("*").eq("customer_id", customerId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as LoyaltyEntry[];
  } catch (err) {
    console.error("[commerce] getLoyaltyLedger error:", err);
    return [];
  }
}
