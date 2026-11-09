// Phase 18 — Server-Side Auth & RBAC Enforcement.
// Verifies a bearer access token — the real signed session token components/crm/Auth.tsx
// already gets back from /api/auth/login (or signup), or a demo-mode
// token (see lib/security/demoToken.ts) — and resolves the caller's role.
// Server-only (imports the database client). Never
// throws; returns null on any failure so callers fail closed.

import { getDb } from "@/lib/db";
import { parseDemoToken } from "./demoToken";
import { getUserFromToken } from "@/lib/auth/service";

export interface Session {
  userId: string;
  role: string;
  demo: boolean;
}

export async function requireAuth(accessToken?: string): Promise<Session | null> {
  if (!accessToken) return null;

  const demo = parseDemoToken(accessToken);
  if (demo) {
    console.warn("[security] session: demo-mode token accepted (not a real session)");
    return { userId: demo.userId, role: demo.role, demo: true };
  }

  try {
    const db = getDb();
    const user = await getUserFromToken(accessToken);
    if (!user) {
      console.error("[security] session: token validation failed");
      return null;
    }
    const data = { user };

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
