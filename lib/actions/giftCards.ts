"use server";
// Phase 28 — Commerce Suite II. Gift card issuance + redemption.

import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";

export type GiftCard = {
  id: string;
  code: string;
  initial_value: number;
  balance: number;
  customer_id: number | null;
  status: "active" | "redeemed" | "expired";
  expires_at: string | null;
  created_at: string;
};

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)
  let out = "";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) out += "-";
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function getGiftCards(accessToken?: string): Promise<GiftCard[]> {
  if (!(await assertCan(accessToken, "commerce", "read"))) return [];
  try {
    const db = getServerClient();
    const { data, error } = await db.from("gift_cards").select("*").order("created_at", { ascending: false });
    if (error) { console.error("[commerce] getGiftCards failed:", error.message); return []; }
    return (data ?? []) as GiftCard[];
  } catch (err) {
    console.error("[commerce] getGiftCards error:", err);
    return [];
  }
}

export async function issueGiftCard(
  valueRupees: number,
  customerId: number | null,
  accessToken?: string,
): Promise<GiftCard | null> {
  if (!(await assertCan(accessToken, "commerce", "create"))) return null;
  try {
    const db = getServerClient();
    const { data, error } = await db.from("gift_cards").insert({
      code: generateCode(), initial_value: valueRupees, balance: valueRupees, customer_id: customerId,
    }).select().single();
    if (error) { console.error("[commerce] issueGiftCard failed:", error.message); return null; }
    return data as GiftCard;
  } catch (err) {
    console.error("[commerce] issueGiftCard error:", err);
    return null;
  }
}

// Applies up to `amountRupees` from the gift card's balance; returns how
// much was actually applied (may be less than requested if balance is low).
export async function redeemGiftCard(code: string, amountRupees: number, accessToken?: string): Promise<{ ok: boolean; applied: number }> {
  if (!(await assertCan(accessToken, "commerce", "update"))) return { ok: false, applied: 0 };
  try {
    const db = getServerClient();
    const { data: card, error: fetchErr } = await db.from("gift_cards").select("*").eq("code", code).eq("status", "active").maybeSingle();
    if (fetchErr || !card) return { ok: false, applied: 0 };

    const applied = Math.min(Number(card.balance), amountRupees);
    const newBalance = Number(card.balance) - applied;
    const { error } = await db.from("gift_cards").update({
      balance: newBalance,
      status: newBalance <= 0 ? "redeemed" : "active",
    }).eq("id", card.id);
    if (error) { console.error("[commerce] redeemGiftCard failed:", error.message); return { ok: false, applied: 0 }; }
    return { ok: true, applied };
  } catch (err) {
    console.error("[commerce] redeemGiftCard error:", err);
    return { ok: false, applied: 0 };
  }
}
