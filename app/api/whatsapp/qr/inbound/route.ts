// Receives inbound messages from the standalone /whatsapp-qr service.
// POST { from: "919812345678", body: "hi", id?: "..." } with Authorization: Bearer <WHATSAPP_QR_SECRET>.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { rateLimit } from "@/lib/security/rateLimit";
import { clientIp } from "../../../analytics/shared";
import { processInboundWhatsapp } from "@/lib/messaging/inboundWhatsapp";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.WHATSAPP_QR_SECRET;
    if (!secret) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 501 });
    if (!rateLimit(`whatsapp:qr:${clientIp(req)}`, 120, 60_000).allowed) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }
    const got = Buffer.from(req.headers.get("authorization") ?? ""), want = Buffer.from(`Bearer ${secret}`);
    if (got.length !== want.length || !timingSafeEqual(got, want)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const j = (await req.json()) as { from?: string; body?: string; id?: string };
    if (!j.from || typeof j.body !== "string") return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    await processInboundWhatsapp(`+${j.from.replace(/\D/g, "")}`, j.body, j.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[messaging] whatsapp qr inbound error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
