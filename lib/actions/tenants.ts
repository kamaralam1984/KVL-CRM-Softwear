"use server";
// Phase 31 — SaaS Mode. Server-action CRUD for `tenants`/`tenant_users`,
// called by lib/whitelabel/store.ts as a fire-and-forget dual-write (same
// pattern as Phase 19's lib/actions/workflows.ts) so every existing caller
// of the whitelabel store keeps working unchanged even when Supabase is
// unavailable — localStorage stays the fast client cache, this becomes the
// cross-device source of truth.

import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";
import { createRazorpayPlan, createRazorpaySubscription } from "@/lib/payments/razorpay";
import type { Tenant } from "@/lib/whitelabel/types";

type DbTenant = {
  id: string; slug: string; brand_name: string; tagline: string; logo_url: string;
  primary_color: string; domain: string; support_email: string; smtp: unknown; whatsapp: unknown;
  plan: string; active: boolean; billing_status: string; trial_ends_at: string | null; created_at: string;
};

function toTenant(row: DbTenant): Tenant {
  return {
    id: row.id, slug: row.slug, brandName: row.brand_name, tagline: row.tagline,
    logoUrl: row.logo_url, primaryColor: row.primary_color, domain: row.domain,
    supportEmail: row.support_email, smtp: row.smtp as Tenant["smtp"], whatsapp: row.whatsapp as Tenant["whatsapp"],
    plan: row.plan, active: row.active, createdAt: row.created_at,
  };
}

export async function getDbTenants(accessToken?: string): Promise<Tenant[]> {
  if (!(await assertCan(accessToken, "whitelabel", "read"))) return [];
  try {
    const db = getServerClient();
    const { data, error } = await db.from("tenants").select("*").order("created_at", { ascending: false });
    if (error) return [];
    return (data as DbTenant[]).map(toTenant);
  } catch (err) {
    console.error("[tenants] getDbTenants error:", err);
    return [];
  }
}

// Fire-and-forget target for lib/whitelabel/store.ts::saveTenant — upserts by
// slug. Never throws.
export async function upsertDbTenant(tenant: Tenant): Promise<void> {
  try {
    const db = getServerClient();
    const { error } = await db.from("tenants").upsert({
      slug: tenant.slug, brand_name: tenant.brandName, tagline: tenant.tagline ?? "",
      logo_url: tenant.logoUrl ?? "", primary_color: tenant.primaryColor ?? "", domain: tenant.domain ?? "",
      support_email: tenant.supportEmail ?? "", smtp: tenant.smtp ?? null, whatsapp: tenant.whatsapp ?? null,
      plan: tenant.plan ?? "", active: tenant.active,
    }, { onConflict: "slug" });
    if (error) console.error("[tenants] upsertDbTenant failed:", error.message);
  } catch (err) {
    console.error("[tenants] upsertDbTenant error:", err);
  }
}

export async function deleteDbTenant(slug: string): Promise<void> {
  try {
    const db = getServerClient();
    const { error } = await db.from("tenants").delete().eq("slug", slug);
    if (error) console.error("[tenants] deleteDbTenant failed:", error.message);
  } catch (err) {
    console.error("[tenants] deleteDbTenant error:", err);
  }
}

// ── Self-serve signup (app/signup/[plan]/page.tsx) ──────────────────────────

const PLAN_PRICES_RUPEES: Record<string, number> = { starter: 999, growth: 2999, enterprise: 9999 };

export async function signupTenant(
  input: { userId: string; brandName: string; slug: string; email: string; plan: string },
): Promise<{ ok: boolean; checkoutUrl?: string; error?: string }> {
  try {
    const db = getServerClient();
    const priceRupees = PLAN_PRICES_RUPEES[input.plan] ?? PLAN_PRICES_RUPEES.starter;

    const plan = await createRazorpayPlan(priceRupees * 100, `KVL CRM — ${input.plan}`, "monthly");
    let subscriptionId: string | undefined;
    let checkoutUrl: string | undefined;
    if (plan.planId) {
      const sub = await createRazorpaySubscription(plan.planId);
      subscriptionId = sub.subscriptionId;
      checkoutUrl = sub.shortUrl;
    }

    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14-day trial

    const { data: tenant, error } = await db.from("tenants").insert({
      slug: input.slug, brand_name: input.brandName, support_email: input.email, plan: input.plan,
      razorpay_subscription_id: subscriptionId ?? null, billing_status: "trialing", trial_ends_at: trialEndsAt,
    }).select().single();
    if (error || !tenant) { console.error("[tenants] signupTenant insert failed:", error?.message); return { ok: false, error: "Could not create workspace" }; }

    const { error: linkErr } = await db.from("tenant_users").insert({ tenant_id: tenant.id, user_id: input.userId, role: "owner" });
    if (linkErr) console.error("[tenants] signupTenant tenant_users link failed:", linkErr.message);

    return { ok: true, checkoutUrl };
  } catch (err) {
    console.error("[tenants] signupTenant error:", err);
    return { ok: false, error: "Signup failed" };
  }
}
