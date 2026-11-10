// Meta WhatsApp Cloud API webhook (own-number mode).
//   GET  — Meta's one-time verification handshake (hub.verify_token → hub.challenge)
//   POST — inbound messages, verified with X-Hub-Signature-256 (META_APP_SECRET)
// Configure in Meta → WhatsApp → Configuration: callback URL = <app>/api/whatsapp/cloud,
// verify token = WHATSAPP_CLOUD_VERIFY_TOKEN, subscribe to the "messages" field.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { rateLimit } from "@/lib/security/rateLimit";
import { clientIp } from "../../analytics/shared";
import { verifyMetaSignature } from "@/lib/messaging/metaSignature";
import { processInboundWhatsapp } from "@/lib/messaging/inboundWhatsapp";
import { applyDeliveryStatus, type DeliveryStatus } from "@/lib/messaging/status";
import { waEnv } from "@/lib/whatsapp/config";

export const dynamic = "force-dynamic";

function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function GET(req: NextRequest) {
  const expected = (await waEnv()).WHATSAPP_CLOUD_VERIFY_TOKEN; // saved in CRM → WhatsApp Setup (or .env)
  const p = req.nextUrl.searchParams;
  if (expected && p.get("hub.mode") === "subscribe" && same(p.get("hub.verify_token") ?? "", expected)) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
}

interface CloudPayload {
  entry?: { changes?: { value?: { statuses?: { id?: string; status?: string; errors?: { title?: string; message?: string }[] }[]; messages?: { from?: string; id?: string; type?: string; text?: { body?: string }; button?: { text?: string }; interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } } }[] } }[] }[];
}

export async function POST(req: NextRequest) {
  try {
    const appSecret = (await waEnv()).META_APP_SECRET;
    if (!appSecret) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 501 });
    if (!rateLimit(`whatsapp:cloud:${clientIp(req)}`, 120, 60_000).allowed) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }
    const raw = await req.text();
    if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"), appSecret)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const payload = JSON.parse(raw) as CloudPayload;
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const st of change.value?.statuses ?? []) {
          if (st.id && ["sent", "delivered", "read", "failed"].includes(st.status ?? "")) {
            await applyDeliveryStatus(st.id, st.status as DeliveryStatus, st.errors?.[0]?.message ?? st.errors?.[0]?.title ?? "");
          }
        }
        for (const m of change.value?.messages ?? []) {
          if (!m.from) continue;
          const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? `[${m.type ?? "message"}]`;
          await processInboundWhatsapp(`+${m.from}`, text, m.id);
        }
      }
    }
    return NextResponse.json({ ok: true }); // Meta needs a fast 200 or it retries
  } catch (err) {
    console.error("[messaging] whatsapp cloud webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}
