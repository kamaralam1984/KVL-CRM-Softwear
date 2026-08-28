// Phase 27 — Commerce Suite I. POST /api/integrations/razorpay/webhook —
// Razorpay calls this on payment events. Signature-verified (HMAC-SHA256,
// see lib/payments/razorpay.ts) — the first webhook signature verification
// in this codebase. Inert (501) until RAZORPAY_WEBHOOK_SECRET is set.
//
// Phase 29 — extended (not duplicated) to also handle subscription.charged/
// cancelled for membership billing.
//
// Phase 39 — gap-check found this route had signature verification but NO
// rate limiting, unlike the Twilio inbound webhooks (whatsapp/sms) which
// have both. Signature verification alone doesn't stop a flood of requests
// from being verified one-by-one — added the same rateLimit() call.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { clientIp } from "../../../analytics/shared";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";
import { markOrderPaidByProviderRef } from "@/lib/actions/orders";
import { markMembershipCharged, markMembershipCancelled } from "@/lib/actions/membership";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: "not_configured" }, { status: 501 });
    }

    const limit = rateLimit(`razorpay:webhook:${clientIp(req)}`, 60, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }
    const event = payload as {
      event?: string;
      payload?: {
        payment_link?: { entity?: { id?: string } };
        order?: { entity?: { id?: string; receipt?: string } };
        subscription?: { entity?: { id?: string } };
      };
    };

    if (event.event === "payment_link.paid" || event.event === "order.paid") {
      const ref = event.payload?.payment_link?.entity?.id ?? event.payload?.order?.entity?.id;
      if (ref) await markOrderPaidByProviderRef(ref);
    } else if (event.event === "subscription.charged") {
      const subId = event.payload?.subscription?.entity?.id;
      if (subId) await markMembershipCharged(subId);
    } else if (event.event === "subscription.cancelled") {
      const subId = event.payload?.subscription?.entity?.id;
      if (subId) await markMembershipCancelled(subId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[payments] razorpay webhook error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
