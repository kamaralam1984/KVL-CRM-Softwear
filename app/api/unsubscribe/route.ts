// One-click unsubscribe (RFC 8058): mail clients POST here via the List-Unsubscribe header.
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { clientIp } from "../analytics/shared";
import { verifyUnsubscribe } from "@/lib/compliance/token";
import { addSuppression } from "@/lib/compliance/dnc";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!rateLimit(`unsubscribe:${clientIp(req)}`, 30, 60_000).allowed) return NextResponse.json({ ok: false }, { status: 429 });
  const p = req.nextUrl.searchParams;
  const email = p.get("e") ?? "", token = p.get("t") ?? "";
  if (!verifyUnsubscribe(email, token)) return NextResponse.json({ ok: false, error: "invalid_link" }, { status: 400 });
  await addSuppression({ email }, { channel: "all", reason: "Unsubscribed via link", source: "unsubscribe_link" });
  return NextResponse.json({ ok: true });
}
