"use server";
// Phase 30 — Affiliate Manager. CRUD for affiliates/commissions.
// Phase 36 — extends with real Razorpay Route (RazorpayX) payout automation.

import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";
import { isRazorpayXConfigured, createFundAccount, createPayout } from "@/lib/payments/razorpayRoute";

export type Affiliate = {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  commission_rate: number;
  status: "active" | "paused";
  payout_vpa: string;
  razorpayx_contact_id: string;
  razorpayx_fund_account_id: string;
  created_at: string;
};

export type AffiliateCommission = {
  id: string;
  affiliate_id: string;
  order_id: string | null;
  amount: number;
  status: "pending" | "paid_out";
  razorpayx_payout_id: string;
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

// Phase 36 — one-time setup: creates a RazorpayX Contact + Fund Account
// (UPI VPA) for a payee and persists the ids onto the affiliate row. Must
// succeed before payCommissionViaRazorpayX can be used for that affiliate.
export async function saveAffiliatePayoutDetails(
  affiliateId: string,
  vpa: string,
  accessToken?: string,
): Promise<{ ok: boolean; mock: boolean }> {
  if (!(await assertCan(accessToken, "affiliates", "update"))) return { ok: false, mock: false };
  try {
    const db = getServerClient();
    const { data: affiliate, error: fetchErr } = await db.from("affiliates").select("*").eq("id", affiliateId).single();
    if (fetchErr || !affiliate) return { ok: false, mock: false };

    const result = await createFundAccount(affiliate.name, affiliate.email ?? "", "", vpa);
    if (!result.ok) return { ok: false, mock: result.mock };

    const { error } = await db.from("affiliates").update({
      payout_vpa: vpa,
      razorpayx_contact_id: result.contactId ?? "",
      razorpayx_fund_account_id: result.fundAccountId ?? "",
    }).eq("id", affiliateId);
    if (error) { console.error("[affiliates] saveAffiliatePayoutDetails save failed:", error.message); return { ok: false, mock: result.mock }; }
    return { ok: true, mock: result.mock };
  } catch (err) {
    console.error("[affiliates] saveAffiliatePayoutDetails error:", err);
    return { ok: false, mock: false };
  }
}

// Phase 36 — the real payout, once RazorpayX is configured AND the
// affiliate has a saved fund account. Falls back cleanly (ok:false,
// reason:"not_ready") when either is missing — the Affiliates UI uses that
// to keep offering markCommissionPaidManually instead, exactly as before
// this function existed.
export async function payCommissionViaRazorpayX(
  commissionId: string,
  accessToken?: string,
): Promise<{ ok: boolean; mock: boolean; reason?: "not_configured" | "no_fund_account" | "not_found" | "payout_failed" }> {
  if (!(await assertCan(accessToken, "affiliates", "update"))) return { ok: false, mock: false };
  if (!isRazorpayXConfigured()) return { ok: false, mock: false, reason: "not_configured" };

  try {
    const db = getServerClient();
    const { data: commission, error: cErr } = await db.from("affiliate_commissions").select("*").eq("id", commissionId).single();
    if (cErr || !commission) return { ok: false, mock: false, reason: "not_found" };

    const { data: affiliate, error: aErr } = await db.from("affiliates").select("*").eq("id", commission.affiliate_id).single();
    if (aErr || !affiliate?.razorpayx_fund_account_id) return { ok: false, mock: false, reason: "no_fund_account" };

    const amountPaise = Math.round(Number(commission.amount) * 100);
    const result = await createPayout(affiliate.razorpayx_fund_account_id, amountPaise, commissionId, `Affiliate commission — ${affiliate.name}`);
    if (!result.ok) return { ok: false, mock: result.mock, reason: "payout_failed" };

    const { error } = await db.from("affiliate_commissions").update({
      status: "paid_out",
      paid_at: new Date().toISOString(),
      razorpayx_payout_id: result.payoutId ?? "",
    }).eq("id", commissionId);
    if (error) console.error("[affiliates] payCommissionViaRazorpayX save failed:", error.message);

    return { ok: true, mock: result.mock };
  } catch (err) {
    console.error("[affiliates] payCommissionViaRazorpayX error:", err);
    return { ok: false, mock: false, reason: "payout_failed" };
  }
}
