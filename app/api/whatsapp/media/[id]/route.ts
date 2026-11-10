// Serves a stored inbound WhatsApp attachment. Access needs the HMAC `sig` issued when it was saved
// (lib/whatsapp/media.ts) — the URL alone is not enough. Content is user-supplied, so it is served with
// nosniff + a sandboxing CSP, and only known-safe types render inline.

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyMediaSig } from "@/lib/whatsapp/media";

export const dynamic = "force-dynamic";

const INLINE = /^(image\/(jpeg|png|webp|gif)|audio\/[\w.+-]+|video\/(mp4|3gpp|webm|quicktime)|application\/pdf)(;|$)/i;
const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id) || !verifyMediaSig(id, req.nextUrl.searchParams.get("sig"))) return new NextResponse("Not found", { status: 404 });
  const { data } = await getDb().from("wa_media").select("mime,filename,data_b64").eq("id", id).maybeSingle();
  if (!data) return new NextResponse("Not found", { status: 404 });
  const mime = String(data.mime || "application/octet-stream");
  const safe = INLINE.test(mime);
  const name = String(data.filename || "attachment").replace(/[^\w.\- ]/g, "_");
  return new NextResponse(Buffer.from(String(data.data_b64), "base64"), {
    headers: {
      "Content-Type": safe ? mime : "application/octet-stream",
      "Content-Disposition": `${safe ? "inline" : "attachment"}; filename="${name}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
