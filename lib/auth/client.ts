// Browser helpers for the auth API. (Replaces the old hosted-auth SDK client.)
export interface ClientUser { id: string; email: string; name: string; role: string }
export interface ClientAuthResult { user?: ClientUser; accessToken?: string; error?: string }

/** True when this deployment has real accounts (set NEXT_PUBLIC_AUTH_ENABLED=true); otherwise the login screen runs in demo mode. */
export function isAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
}

async function call(path: string, init?: RequestInit): Promise<ClientAuthResult & { ok?: boolean }> {
  try {
    const res = await fetch(path, init);
    const j = (await res.json().catch(() => ({}))) as ClientAuthResult & { ok?: boolean };
    return res.ok && j.ok !== false ? j : { error: j.error ?? `Request failed (${res.status})` };
  } catch { return { error: "Network error — please check your connection and try again." }; }
}
const post = (path: string, data: unknown) => call(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });

export const signInWithPassword = (email: string, password: string) => post("/api/auth/login", { email, password });
export const signUp = (email: string, password: string, extra: { name?: string; role?: string } = {}) => post("/api/auth/signup", { email, password, ...extra });
export const requestPasswordReset = (email: string) => post("/api/auth/forgot", { email });
export const resetPassword = (token: string, password: string) => post("/api/auth/reset", { token, password });
export const startOAuth = (provider: "google" | "github") => { window.location.href = `/api/auth/oauth/${provider}`; };

/** After an OAuth redirect the session token arrives in the URL hash (#oauth_token=…). Exchanges it for the user and clears the hash. */
export async function consumeOAuthHash(): Promise<ClientAuthResult | null> {
  const m = window.location.hash.match(/oauth_token=([\w.-]+)/);
  if (!m) return null;
  history.replaceState(null, "", window.location.pathname + window.location.search);
  return call("/api/auth/me", { headers: { Authorization: `Bearer ${m[1]}` } });
}
