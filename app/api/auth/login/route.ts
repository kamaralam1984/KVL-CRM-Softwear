import { NextRequest } from "next/server";
import { signIn } from "@/lib/auth/service";
import { limited, respond, body } from "@/lib/auth/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const blocked = limited(req, "login", 10);
  if (blocked) return blocked;
  const { email = "", password = "" } = await body<{ email: string; password: string }>(req);
  return respond(await signIn(String(email), String(password)));
}
