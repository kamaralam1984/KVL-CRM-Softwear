import { NextRequest } from "next/server";
import { me } from "@/lib/auth/service";
import { limited, respond } from "@/lib/auth/http";

export const dynamic = "force-dynamic";

/** Validates the Bearer token and returns a fresh session (used after OAuth redirects and to refresh the user). */
export async function GET(req: NextRequest) {
  const blocked = limited(req, "me", 60);
  if (blocked) return blocked;
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return respond(await me(token));
}
