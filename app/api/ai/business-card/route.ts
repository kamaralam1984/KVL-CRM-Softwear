// POST /api/ai/business-card — AI Business-Card Scanner (Phase 32).
//
// Body: { "image": "<base64>", "mediaType"?: "image/jpeg"|"image/png"|"image/webp" }
// Returns: { "ok": boolean, "card"?: ScannedCard }
//
// Optional shared-secret guard, same convention as /api/assistant/ask.

import { NextRequest, NextResponse } from "next/server";
import { scanBusinessCard } from "@/lib/ai/businessCardScan";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.ASSISTANT_API_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return null;
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const b = (body ?? {}) as { image?: string; mediaType?: "image/jpeg" | "image/png" | "image/webp" };
  if (!b.image) {
    return NextResponse.json({ ok: false, error: "missing_image" }, { status: 400 });
  }

  const card = await scanBusinessCard(b.image, b.mediaType ?? "image/jpeg");
  if (!card) {
    return NextResponse.json({ ok: false, error: "scan_failed_or_not_configured" }, { status: 200 });
  }
  return NextResponse.json({ ok: true, card });
}
