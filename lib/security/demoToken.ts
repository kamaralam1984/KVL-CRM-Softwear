// Phase 18 — Server-Side Auth & RBAC Enforcement.
// Pure, isomorphic (no server-only imports) token helpers for demo-mode logins
// — the non-Supabase fallback path in components/crm/Auth.tsx where any
// email + 4-char password signs a user in locally. A demo token carries the
// role the client already decided (same trust level demo mode already has),
// just made explicit so lib/security/session.ts can recognize and log it
// instead of silently treating every caller as unauthenticated.
// Safe to import from "use client" files — never touches Supabase or secrets.

export const DEMO_TOKEN_PREFIX = "demo:";

export function makeDemoToken(userId: string, role: string): string {
  return `${DEMO_TOKEN_PREFIX}${encodeURIComponent(userId)}:${encodeURIComponent(role)}`;
}

export function parseDemoToken(token: string): { userId: string; role: string } | null {
  if (!token.startsWith(DEMO_TOKEN_PREFIX)) return null;
  const [, encodedUserId, encodedRole] = token.split(":");
  if (!encodedUserId || !encodedRole) return null;
  try {
    return { userId: decodeURIComponent(encodedUserId), role: decodeURIComponent(encodedRole) };
  } catch {
    return null;
  }
}
