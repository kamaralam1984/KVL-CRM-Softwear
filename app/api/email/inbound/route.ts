// Provider-neutral inbound email endpoint (Mailgun/Postmark/SendGrid parse, Gmail forwarder, Zapier…).
// POST JSON { from, to?, subject?, text?, html? } with Authorization: Bearer <EMAIL_INBOUND_SECRET>.
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { rateLimit } from "@/lib/security/rateLimit";
import { clientIp } from "../../analytics/shared";
import { processInboundEmail } from "@/lib/messaging/emailEvents";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.EMAIL_INBOUND_SECRET;
    if (!secret) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 501 });
    if (!rateLimit(`email:inbound:${clientIp(req)}`, 120, 60_000).allowed) return NextResponse.json({ ok: false }, { status: 429 });
    const got = Buffer.from(req.headers.get("authorization") ?? ""), want = Buffer.from(`Bearer ${secret}`);
    if (got.length !== want.length || !timingSafeEqual(got, want)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const j = (await req.json()) as { from?: string; to?: string; subject?: string; text?: string; html?: string; messageId?: string };
    if (!j.from) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    const r = await processInboundEmail({ from: j.from, to: j.to, subject: j.subject, text: j.text, html: j.html, messageId: j.messageId });
    return NextResponse.json({ ok: r.handled });
  } catch (err) {
    console.error("[email] inbound error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
