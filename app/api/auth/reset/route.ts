import { NextRequest, NextResponse } from "next/server";
import { resetPassword } from "@/lib/auth/service";
import { limited, body, noStore } from "@/lib/auth/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const blocked = limited(req, "reset", 10);
  if (blocked) return blocked;
  const { token = "", password = "" } = await body<{ token: string; password: string }>(req);
  const r = await resetPassword(String(token), String(password));
  return NextResponse.json(r, { status: r.ok ? 200 : 400, headers: noStore });
}
