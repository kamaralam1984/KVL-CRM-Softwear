"use server";
// Phase 30 — Affiliate Manager. CRUD for affiliates/commissions.

import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";

export type Affiliate = {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  commission_rate: number;
  status: "active" | "paused";
  created_at: string;
};

export type AffiliateCommission = {
  id: string;
  affiliate_id: string;
  order_id: string | null;
  amount: number;
  status: "pending" | "paid_out";
  created_at: string;
};

function generateReferralCode(name: string): string {
  const base = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PARTNER";
  return `${base}${Math.floor(Math.random() * 900 + 100)}`;
}

export async function getAffiliates(accessToken?: string): Promise<Affiliate[]> {
  if (!(await assertCan(accessToken, "affiliates", "read"))) return [];
  try {
    const db = getServerClient();
    const { data, error } = await db.from("affiliates").select("*").order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as Affiliate[];
  } catch (err) {
    console.error("[affiliates] getAffiliates error:", err);
    return [];
  }
}

export async function createAffiliate(name: string, email: string, commissionRate = 0.1, accessToken?: string): Promise<Affiliate | null> {
  if (!(await assertCan(accessToken, "affiliates", "create"))) return null;
  try {
    const db = getServerClient();
    const { data, error } = await db.from("affiliates").insert({
      name, email, referral_code: generateReferralCode(name), commission_rate: commissionRate,
    }).select().single();
    if (error) { console.error("[affiliates] createAffiliate failed:", error.message); return null; }
    return data as Affiliate;
  } catch (err) {
    console.error("[affiliates] createAffiliate error:", err);
    return null;
  }
}

export async function getCommissionsForAffiliate(affiliateId: string, accessToken?: string): Promise<AffiliateCommission[]> {
  if (!(await assertCan(accessToken, "affiliates", "read"))) return [];
  try {
    const db = getServerClient();
    const { data, error } = await db.from("affiliate_commissions").select("*").eq("affiliate_id", affiliateId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as AffiliateCommission[];
  } catch (err) {
    console.error("[affiliates] getCommissionsForAffiliate error:", err);
    return [];
  }
}

// Commission PAYOUT (actually transferring money) needs Razorpay Route — a
// separate partner-approved product with its own KYC per payee. Out of scope
// here by design (see docs/GHL_PARITY_STATUS.md's "not achievable by code
// alone" table) — this just marks the ledger row so a human can pay out
// manually and record it, honestly labeled rather than faking automation.
export async function markCommissionPaidManually(commissionId: string, accessToken?: string): Promise<{ ok: boolean }> {
  if (!(await assertCan(accessToken, "affiliates", "update"))) return { ok: false };
  try {
    const db = getServerClient();
    const { error } = await db.from("affiliate_commissions").update({ status: "paid_out", paid_at: new Date().toISOString() }).eq("id", commissionId);
    if (error) return { ok: false };
    return { ok: true };
  } catch (err) {
    console.error("[affiliates] markCommissionPaidManually error:", err);
    return { ok: false };
  }
}
