"use client";
// Phase 18 — Server-Side Auth & RBAC Enforcement.
// Section components are rendered with no props (see app/page.tsx's
// `<Section />`), so there's no `user` passed down to thread an access token
// through. Instead, read the token components/crm/Auth.tsx already persists
// onto `crm_user` in localStorage (same key app/page.tsx's session-restore
// effect already reads) — one shared helper any section can call before
// invoking a server action that accepts an optional trailing `accessToken`.

export function getAccessToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem("crm_user");
    if (!raw) return undefined;
    const user = JSON.parse(raw) as { accessToken?: unknown };
    return typeof user?.accessToken === "string" ? user.accessToken : undefined;
  } catch {
    return undefined;
  }
}
