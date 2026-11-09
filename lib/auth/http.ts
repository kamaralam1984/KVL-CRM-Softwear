// Shared helpers for /api/auth/* route handlers.
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { clientIp } from "@/app/api/analytics/shared";
import type { AuthResult } from "./service";

export const noStore = { "Cache-Control": "no-store" };

export function limited(req: NextRequest, bucket: string, max: number, windowMs = 60_000): NextResponse | null {
  return rateLimit(`auth:${bucket}:${clientIp(req)}`, max, windowMs).allowed
    ? null
    : NextResponse.json({ ok: false, error: "Too many attempts — please wait a minute and try again" }, { status: 429, headers: noStore });
}

export function respond(r: AuthResult): NextResponse {
  return r.ok
    ? NextResponse.json({ ok: true, user: r.user, accessToken: r.accessToken }, { headers: noStore })
    : NextResponse.json({ ok: false, error: r.error }, { status: r.status, headers: noStore });
}

export async function body<T>(req: NextRequest): Promise<Partial<T>> {
  try { return (await req.json()) as Partial<T>; } catch { return {}; }
}

export function origin(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || req.nextUrl.origin;
}
