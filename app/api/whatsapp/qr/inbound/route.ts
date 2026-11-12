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
import { notifyTeam } from "@/lib/notify/team";

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
    const j = (await req.json()) as { type?: string; state?: string; reason?: string; from?: string; body?: string; id?: string; status?: string; media?: { kind?: string; mime?: string; filename?: string; b64?: string } };
    if (j.type === "state") { // QR service connection health → in-app alert (bell) + team contacts
      const st = String(j.state ?? "");
      if (st === "open") await notifyTeam({ kind: "whatsapp_status", priority: "normal", title: "✅ WhatsApp number reconnected", body: "Broadcasts and replies are flowing again." });
      else if (st === "closed" || st === "logged_out") await notifyTeam({ kind: "whatsapp_status", priority: "high", title: st === "logged_out" ? "⚠ WhatsApp logged out — re-scan the QR" : "⚠ WhatsApp number disconnected", body: `${String(j.reason ?? "").slice(0, 200)} Open CRM ▸ WhatsApp ▸ Setup to reconnect. Running broadcasts will pause on their own.`.trim() });
      return NextResponse.json({ ok: true });
    }
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
