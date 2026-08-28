// Phase 40 — Public API. Authenticates a request against `api_keys` by
// `Authorization: Bearer <key>`, matching the hash (never the plaintext).
// Used only by app/api/v1/** route handlers — never by internal server
// actions, which use lib/security/requireAction.ts's session-based RBAC
// instead. These are a different trust boundary: an api_keys row grants a
// 3rd-party integration programmatic access, not a logged-in staff session.

import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabase/server";

export type ApiKeyAuth = { ok: true; siteId: string; keyId: string } | { ok: false };

export async function authenticateApiKey(req: NextRequest): Promise<ApiKeyAuth> {
  const header = req.headers.get("authorization");
  const key = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!key) return { ok: false };

  try {
    const hash = createHash("sha256").update(key).digest("hex");
    const db = getServerClient();
    const { data, error } = await db.from("api_keys").select("id, site_id").eq("key_hash", hash).eq("active", true).maybeSingle();
    if (error || !data) return { ok: false };

    db.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(
      () => {},
      () => {},
    );

    return { ok: true, siteId: data.site_id, keyId: data.id };
  } catch (err) {
    console.error("[developers] authenticateApiKey error:", err);
    return { ok: false };
  }
}
