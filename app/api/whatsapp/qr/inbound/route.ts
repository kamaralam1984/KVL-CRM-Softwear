// Receives inbound messages from the standalone /whatsapp-qr service.
// POST { from: "919812345678", body: "hi", id?: "..." } with Authorization: Bearer <WHATSAPP_QR_SECRET>.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { rateLimit } from "@/lib/security/rateLimit";
import { clientIp } from "../../../analytics/shared";
import { processInboundWhatsapp } from "@/lib/messaging/inboundWhatsapp";
import { waEnv } from "@/lib/whatsapp/config";
import { runAfterResponse } from "@/lib/messaging/background";
import { applyDeliveryStatus, type DeliveryStatus } from "@/lib/messaging/status";
import { mediaLabel, saveInboundMedia } from "@/lib/whatsapp/media";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const secret = (await waEnv()).WHATSAPP_QR_SECRET;
    if (!secret) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 501 });
    if (!rateLimit(`whatsapp:qr:${clientIp(req)}`, 120, 60_000).allowed) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }
    const got = Buffer.from(req.headers.get("authorization") ?? ""), want = Buffer.from(`Bearer ${secret}`);
    if (got.length !== want.length || !timingSafeEqual(got, want)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const j = (await req.json()) as { type?: string; from?: string; body?: string; id?: string; status?: string; media?: { kind?: string; mime?: string; filename?: string; b64?: string } };
    if (j.type === "status") { // delivery / read receipt for a message we sent (QR service forwards Baileys receipts)
      if (j.id && (j.status === "delivered" || j.status === "read" || j.status === "failed")) await runAfterResponse(() => applyDeliveryStatus(j.id!, j.status as DeliveryStatus, "Not delivered"));
      return NextResponse.json({ ok: true });
    }
    if (!j.from || typeof j.body !== "string") return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    const from = `+${j.from.replace(/\D/g, "")}`, id = j.id, media = j.media;
    let text = j.body;
    await runAfterResponse(async () => {
      let mediaUrl: string | undefined;
      if (media?.b64) {
        text = mediaLabel(media.kind ?? "document", text.startsWith("[") ? "" : text);
        mediaUrl = (await saveInboundMedia({ data: Buffer.from(media.b64, "base64"), mime: media.mime ?? "", filename: media.filename })) ?? undefined;
      }
      await processInboundWhatsapp(from, text, id, mediaUrl);
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[messaging] whatsapp qr inbound error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
