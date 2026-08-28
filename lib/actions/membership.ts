"use server";
// Phase 29 — Membership & Courses. CRUD for tiers/memberships/content, plus
// the subscribe flow that ties a customer to a tier via Razorpay Subscriptions.

import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";
import { createRazorpayPlan, createRazorpaySubscription } from "@/lib/payments/razorpay";

export type MembershipTier = {
  id: string;
  site_id: string;
  name: string;
  price: number;
  billing_interval: "monthly" | "yearly" | "one_time";
  razorpay_plan_id: string | null;
};

export type CourseContentItem = {
  id: string;
  tier_id: string | null;
  title: string;
  content_type: "video" | "document" | "link" | "text";
  content_url: string;
  drip_day: number;
  sort_order: number;
};

export async function getMembershipTiers(siteId = DEFAULT_SITE_ID, accessToken?: string): Promise<MembershipTier[]> {
  if (!(await assertCan(accessToken, "membership", "read"))) return [];
  try {
    const db = getServerClient();
    const { data, error } = await db.from("membership_tiers").select("*").eq("site_id", siteId).order("price", { ascending: true });
    if (error) return [];
    return (data ?? []) as MembershipTier[];
  } catch (err) {
    console.error("[membership] getMembershipTiers error:", err);
    return [];
  }
}

export async function createMembershipTier(
  input: { name: string; priceRupees: number; interval: "monthly" | "yearly" | "one_time"; siteId?: string },
  accessToken?: string,
): Promise<MembershipTier | null> {
  if (!(await assertCan(accessToken, "membership", "create"))) return null;
  try {
    let planId: string | null = null;
    if (input.interval !== "one_time") {
      const plan = await createRazorpayPlan(Math.round(input.priceRupees * 100), input.name, input.interval);
      planId = plan.planId ?? null;
    }
    const db = getServerClient();
    const { data, error } = await db.from("membership_tiers").insert({
      site_id: input.siteId ?? DEFAULT_SITE_ID, name: input.name, price: input.priceRupees,
      billing_interval: input.interval, razorpay_plan_id: planId,
    }).select().single();
    if (error) { console.error("[membership] createMembershipTier failed:", error.message); return null; }
    return data as MembershipTier;
  } catch (err) {
    console.error("[membership] createMembershipTier error:", err);
    return null;
  }
}

// Subscribes a customer to a tier — creates a real Razorpay Subscription when
// the tier has a plan (recurring), or just links directly for one-time tiers.
export async function subscribeCustomerToTier(customerId: number, tierId: string, accessToken?: string): Promise<{ ok: boolean; checkoutUrl?: string }> {
  if (!(await assertCan(accessToken, "membership", "create"))) return { ok: false };
  try {
    const db = getServerClient();
    const { data: tier } = await db.from("membership_tiers").select("*").eq("id", tierId).maybeSingle();
    if (!tier) return { ok: false };

    let subscriptionId: string | null = null;
    let checkoutUrl: string | undefined;
    if (tier.razorpay_plan_id) {
      const sub = await createRazorpaySubscription(tier.razorpay_plan_id);
      subscriptionId = sub.subscriptionId ?? null;
      checkoutUrl = sub.shortUrl;
    }

    const { error } = await db.from("memberships").insert({
      customer_id: customerId, tier_id: tierId, status: "active", razorpay_subscription_id: subscriptionId,
    });
    if (error) { console.error("[membership] subscribeCustomerToTier failed:", error.message); return { ok: false }; }
    return { ok: true, checkoutUrl };
  } catch (err) {
    console.error("[membership] subscribeCustomerToTier error:", err);
    return { ok: false };
  }
}

// Public entry point for app/member/[tierId]'s Subscribe form — the visitor
// has no CRM login (see that route's own honest-gap comment), so this finds
// or creates a `customers` row by email, then calls subscribeCustomerToTier.
// Gap-check fix: the page previously linked to a non-existent static page
// instead of calling any real subscribe function.
export async function subscribeToMembership(
  tierId: string,
  contact: { name: string; email: string; phone?: string },
): Promise<{ ok: boolean; checkoutUrl?: string; customerId?: number }> {
  if (!contact.email.includes("@")) return { ok: false };
  try {
    const db = getServerClient();
    const { data: existing } = await db.from("customers").select("id").ilike("email", contact.email).maybeSingle();

    let customerId: number;
    if (existing) {
      customerId = existing.id;
    } else {
      const { data: created, error } = await db.from("customers").insert({
        name: contact.name || contact.email, email: contact.email, contact: contact.phone ?? "", phone: contact.phone ?? "",
      }).select("id").single();
      if (error || !created) { console.error("[membership] subscribeToMembership customer create failed:", error?.message); return { ok: false }; }
      customerId = created.id;
    }

    const result = await subscribeCustomerToTier(customerId, tierId);
    return { ...result, customerId };
  } catch (err) {
    console.error("[membership] subscribeToMembership error:", err);
    return { ok: false };
  }
}

export async function getActiveMembershipForCustomer(customerId: number): Promise<{ tierId: string } | null> {
  try {
    const db = getServerClient();
    const { data } = await db.from("memberships").select("tier_id").eq("customer_id", customerId).eq("status", "active").maybeSingle();
    return data ? { tierId: data.tier_id } : null;
  } catch (err) {
    console.error("[membership] getActiveMembershipForCustomer error:", err);
    return null;
  }
}

// Public — checked by app/member/[tierSlug]/page.tsx before rendering gated content.
export async function getCourseContentForTier(tierId: string | null): Promise<CourseContentItem[]> {
  try {
    const db = getServerClient();
    let q = db.from("course_content").select("*").order("sort_order", { ascending: true });
    q = tierId ? q.eq("tier_id", tierId) : q.is("tier_id", null);
    const { data, error } = await q;
    if (error) return [];
    return (data ?? []) as CourseContentItem[];
  } catch (err) {
    console.error("[membership] getCourseContentForTier error:", err);
    return [];
  }
}

export async function addCourseContent(
  input: { tierId: string | null; title: string; contentType: CourseContentItem["content_type"]; contentUrl: string; dripDay: number },
  accessToken?: string,
): Promise<{ ok: boolean }> {
  if (!(await assertCan(accessToken, "membership", "create"))) return { ok: false };
  try {
    const db = getServerClient();
    const { error } = await db.from("course_content").insert({
      tier_id: input.tierId, title: input.title, content_type: input.contentType, content_url: input.contentUrl, drip_day: input.dripDay,
    });
    if (error) { console.error("[membership] addCourseContent failed:", error.message); return { ok: false }; }
    return { ok: true };
  } catch (err) {
    console.error("[membership] addCourseContent error:", err);
    return { ok: false };
  }
}

// Webhook targets (subscription.charged/cancelled) — called from the
// extended Razorpay webhook route, mirroring markOrderPaidByProviderRef.
export async function markMembershipCharged(subscriptionId: string): Promise<void> {
  try {
    const db = getServerClient();
    await db.from("memberships").update({ status: "active" }).eq("razorpay_subscription_id", subscriptionId);
  } catch (err) {
    console.error("[membership] markMembershipCharged failed:", err);
  }
}

export async function markMembershipCancelled(subscriptionId: string): Promise<void> {
  try {
    const db = getServerClient();
    await db.from("memberships").update({ status: "cancelled" }).eq("razorpay_subscription_id", subscriptionId);
  } catch (err) {
    console.error("[membership] markMembershipCancelled failed:", err);
  }
}
