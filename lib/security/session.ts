// Phase 18 — Server-Side Auth & RBAC Enforcement.
// Verifies a bearer access token — the real Supabase JWT components/crm/Auth.tsx
// already gets back from supabase.auth.signInWithPassword/signUp, or a demo-mode
// token (see lib/security/demoToken.ts) — and resolves the caller's role.
// Server-only (imports lib/supabase/server.ts's service-role client). Never
// throws; returns null on any failure so callers fail closed.

import { getServerClient } from "@/lib/supabase/server";
import { parseDemoToken } from "./demoToken";

export interface Session {
  userId: string;
  role: string;
  demo: boolean;
}

export async function requireAuth(accessToken?: string): Promise<Session | null> {
  if (!accessToken) return null;

  const demo = parseDemoToken(accessToken);
  if (demo) {
    console.warn("[security] session: demo-mode token accepted (not a real Supabase session)");
    return { userId: demo.userId, role: demo.role, demo: true };
  }

  try {
    const db = getServerClient();
    const { data, error } = await db.auth.getUser(accessToken);
    if (error || !data?.user) {
      console.error("[security] session: token validation failed", error?.message);
      return null;
    }

    const { data: profile, error: profileErr } = await db
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    if (profileErr || !profile) {
      console.error("[security] session: no profile row for authenticated user", data.user.id, profileErr?.message);
      return { userId: data.user.id, role: "Member", demo: false };
    }

    return { userId: data.user.id, role: String(profile.role || "Member"), demo: false };
  } catch (err) {
    console.error("[security] session: requireAuth failed", err);
    return null;
  }
}
