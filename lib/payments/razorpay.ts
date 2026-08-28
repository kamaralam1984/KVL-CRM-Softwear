// Server-only module (never imported from a client component — always called
// through lib/actions/orders.ts / lib/commerce/text2pay.ts, or directly from
// the webhook Route Handler, both already server-side). Not marked
// "use server" itself since it exports synchronous helpers
// (isRazorpayApiConfigured, verifyRazorpayWebhookSignature), which that
// directive forbids (every export from a "use server" file must be async).
//
// Phase 27 — Commerce Suite I. Extends beyond lib/actions/integrations.ts's
// OAuth-Connect-only scope with the actual Orders/Payment Links APIs + the
// first webhook signature verification in this codebase. Hand-rolled REST,
// no official `razorpay` npm SDK — consistent with every other integration
// here (Twilio, Meta, LinkedIn, Google Business all hand-roll too).
//
// IMPORTANT credential distinction: Razorpay Connect (lib/actions/integrations.ts)
// uses OAuth (RAZORPAY_CLIENT_ID/SECRET, a partner-app credential). Orders/
// Payment Links/webhooks use a DIFFERENT credential — the merchant's own API
// key pair (RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET, Basic-auth'd) — these must
// never be conflated.

import { createHmac, timingSafeEqual } from "crypto";

function authHeader(): string | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export function isRazorpayApiConfigured(): boolean {
  return authHeader() !== null;
}

export interface RazorpayOrderResult {
  ok: boolean;
  mock: boolean;
  orderId?: string;
  detail?: string;
}

// Amount is in the smallest currency unit (paise for INR) per Razorpay's API.
export async function createRazorpayOrder(amountPaise: number, receipt: string, currency = "INR"): Promise<RazorpayOrderResult> {
  const auth = authHeader();
  if (!auth) {
    console.log(`[payments:razorpay:mock] order for receipt "${receipt}" (₹${amountPaise / 100})`);
    return { ok: true, mock: true, orderId: `order_mock_${Date.now().toString(36)}` };
  }
  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountPaise, currency, receipt }),
    });
    if (!res.ok) {
      console.error(`[payments] razorpay createOrder HTTP ${res.status}`);
      return { ok: false, mock: false, detail: `razorpay ${res.status}` };
    }
    const j = (await res.json()) as { id?: string };
    return { ok: true, mock: false, orderId: j.id };
  } catch (err) {
    console.error("[payments] razorpay createOrder error:", err);
    return { ok: false, mock: false, detail: String(err) };
  }
}

export interface RazorpayPaymentLinkResult {
  ok: boolean;
  mock: boolean;
  linkId?: string;
  shortUrl?: string;
  detail?: string;
}

export async function createRazorpayPaymentLink(
  amountPaise: number,
  description: string,
  customer: { name?: string; email?: string; contact?: string },
  currency = "INR",
): Promise<RazorpayPaymentLinkResult> {
  const auth = authHeader();
  if (!auth) {
    console.log(`[payments:razorpay:mock] payment link "${description}" (₹${amountPaise / 100})`);
    return { ok: true, mock: true, linkId: `plink_mock_${Date.now().toString(36)}`, shortUrl: "https://rzp.io/mock-link" };
  }
  try {
    const res = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amountPaise,
        currency,
        description,
        customer: { name: customer.name ?? "", email: customer.email ?? "", contact: customer.contact ?? "" },
        notify: { sms: false, email: false }, // KVL sends the link itself (WhatsApp/SMS), not Razorpay's own notify
      }),
    });
    if (!res.ok) {
      console.error(`[payments] razorpay createPaymentLink HTTP ${res.status}`);
      return { ok: false, mock: false, detail: `razorpay ${res.status}` };
    }
    const j = (await res.json()) as { id?: string; short_url?: string };
    return { ok: true, mock: false, linkId: j.id, shortUrl: j.short_url };
  } catch (err) {
    console.error("[payments] razorpay createPaymentLink error:", err);
    return { ok: false, mock: false, detail: String(err) };
  }
}

// ── Phase 29 — Subscriptions API (membership billing) ───────────────────────

export interface RazorpayPlanResult { ok: boolean; mock: boolean; planId?: string; detail?: string }

export async function createRazorpayPlan(
  amountPaise: number,
  planName: string,
  interval: "monthly" | "yearly",
  currency = "INR",
): Promise<RazorpayPlanResult> {
  const auth = authHeader();
  if (!auth) {
    console.log(`[payments:razorpay:mock] plan "${planName}" (₹${amountPaise / 100}/${interval})`);
    return { ok: true, mock: true, planId: `plan_mock_${Date.now().toString(36)}` };
  }
  try {
    const res = await fetch("https://api.razorpay.com/v1/plans", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        period: interval === "yearly" ? "yearly" : "monthly",
        interval: 1,
        item: { name: planName, amount: amountPaise, currency },
      }),
    });
    if (!res.ok) { console.error(`[payments] razorpay createPlan HTTP ${res.status}`); return { ok: false, mock: false, detail: `razorpay ${res.status}` }; }
    const j = (await res.json()) as { id?: string };
    return { ok: true, mock: false, planId: j.id };
  } catch (err) {
    console.error("[payments] razorpay createPlan error:", err);
    return { ok: false, mock: false, detail: String(err) };
  }
}

export interface RazorpaySubscriptionResult { ok: boolean; mock: boolean; subscriptionId?: string; shortUrl?: string; detail?: string }

export async function createRazorpaySubscription(planId: string, totalCount = 120): Promise<RazorpaySubscriptionResult> {
  const auth = authHeader();
  if (!auth || planId.startsWith("plan_mock_")) {
    console.log(`[payments:razorpay:mock] subscription for plan "${planId}"`);
    return { ok: true, mock: true, subscriptionId: `sub_mock_${Date.now().toString(36)}` };
  }
  try {
    const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: planId, total_count: totalCount, quantity: 1 }),
    });
    if (!res.ok) { console.error(`[payments] razorpay createSubscription HTTP ${res.status}`); return { ok: false, mock: false, detail: `razorpay ${res.status}` }; }
    const j = (await res.json()) as { id?: string; short_url?: string };
    return { ok: true, mock: false, subscriptionId: j.id, shortUrl: j.short_url };
  } catch (err) {
    console.error("[payments] razorpay createSubscription error:", err);
    return { ok: false, mock: false, detail: String(err) };
  }
}

// Razorpay signs webhook bodies with HMAC-SHA256 keyed by RAZORPAY_WEBHOOK_SECRET
// (set separately in the Razorpay dashboard, distinct from the API key pair).
export function verifyRazorpayWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  try {
    const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch (err) {
    console.error("[payments] verifyRazorpayWebhookSignature failed:", err);
    return false;
  }
}
