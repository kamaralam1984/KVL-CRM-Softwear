import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/auth/service";
import { limited, body, origin, noStore } from "@/lib/auth/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const blocked = limited(req, "forgot", 5);
  if (blocked) return blocked;
  const { email = "" } = await body<{ email: string }>(req);
  await requestPasswordReset(String(email), origin(req));
  return NextResponse.json({ ok: true }, { headers: noStore }); // same answer whether or not the account exists
}
