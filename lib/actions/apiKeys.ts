"use server";
// Phase 40 — Public API + Outbound Webhooks. CRUD for `api_keys`. The
// plaintext key is generated here, hashed before storage (sha256 hex), and
// returned to the caller exactly once at creation time — never persisted or
// re-derivable afterward, same "hashed, never store plaintext" discipline a
// real auth credential needs.
//
// Gap-check fix — uses assertCanStrict (deny when no token), not assertCan's
// usual soft mode: a Next.js Server Action is directly callable by anyone
// who's loaded the client bundle, and soft mode would let an unauthenticated
// caller mint a live API key with full leads/contacts/deals access. See
// lib/security/requireAction.ts's assertCanStrict doc comment.

import { createHash, randomBytes } from "crypto";
import { getServerClient } from "@/lib/supabase/server";
import { assertCanStrict } from "@/lib/security/requireAction";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";

export type ApiKey = {
  id: string;
  site_id: string;
  name: string;
  key_prefix: string;
  active: boolean;
  last_used_at: string | null;
  created_at: string;
};

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function getApiKeys(accessToken?: string): Promise<ApiKey[]> {
  if (!(await assertCanStrict(accessToken, "developers", "read"))) return [];
  try {
    const db = getServerClient();
    const { data, error } = await db.from("api_keys").select("id, site_id, name, key_prefix, active, last_used_at, created_at").order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as ApiKey[];
  } catch (err) {
    console.error("[developers] getApiKeys error:", err);
    return [];
  }
}

export async function createApiKey(name: string, accessToken?: string): Promise<{ ok: boolean; plainKey?: string }> {
  if (!(await assertCanStrict(accessToken, "developers", "create"))) return { ok: false };
  try {
    const plainKey = `kvl_live_${randomBytes(24).toString("hex")}`;
    const db = getServerClient();
    const { error } = await db.from("api_keys").insert({
      site_id: DEFAULT_SITE_ID,
      name: name || "Unnamed key",
      key_hash: hashKey(plainKey),
      key_prefix: plainKey.slice(0, 16),
    });
    if (error) { console.error("[developers] createApiKey failed:", error.message); return { ok: false }; }
    return { ok: true, plainKey };
  } catch (err) {
    console.error("[developers] createApiKey error:", err);
    return { ok: false };
  }
}

export async function revokeApiKey(id: string, accessToken?: string): Promise<{ ok: boolean }> {
  if (!(await assertCanStrict(accessToken, "developers", "delete"))) return { ok: false };
  try {
    const db = getServerClient();
    const { error } = await db.from("api_keys").update({ active: false }).eq("id", id);
    if (error) return { ok: false };
    return { ok: true };
  } catch (err) {
    console.error("[developers] revokeApiKey error:", err);
    return { ok: false };
  }
}
