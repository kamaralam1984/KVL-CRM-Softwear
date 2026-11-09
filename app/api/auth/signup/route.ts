import { NextRequest } from "next/server";
import { signUp } from "@/lib/auth/service";
import { limited, respond, body } from "@/lib/auth/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const blocked = limited(req, "signup", 5);
  if (blocked) return blocked;
  const { email = "", password = "", name, role } = await body<{ email: string; password: string; name: string; role: string }>(req);
  // Never trust a client-supplied role: public sign-ups are "Member" (the very first account bootstraps as Admin).
  // Self-serve tenant signup (/signup/[plan]) asks for "Admin"; that is only honoured if the operator opts in.
  const allowAdmin = process.env.AUTH_ALLOW_ADMIN_SIGNUP === "true";
  return respond(await signUp({ email: String(email), password: String(password), name, role: allowAdmin && role === "Admin" ? "Admin" : undefined }));
}
