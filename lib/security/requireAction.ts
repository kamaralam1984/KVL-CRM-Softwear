// Phase 18 — Server-Side Auth & RBAC Enforcement.
// Thin wrapper combining requireAuth() + rbac.can() for server actions/API
// routes. Rollout strategy: server actions add `accessToken?: string` as a new
// OPTIONAL trailing parameter one file at a time (see docs plan). A request
// with no token is allowed in "soft mode" (warn + proceed) so every existing
// caller keeps working untouched while the token gets threaded through call
// sites phase by phase. A token that IS present but fails validation, or a
// validated session that lacks the grant, is denied — presenting a bad token
// is treated as more suspicious than sending none at all.

import { can, type Action, type Resource } from "./rbac";
import { requireAuth } from "./session";

export async function assertCan(
  accessToken: string | undefined,
  resource: Resource | string,
  action: Action,
): Promise<boolean> {
  if (!accessToken) {
    console.warn(`[security] rbac: no token supplied for ${resource}:${action}, allowing (soft mode)`);
    return true;
  }

  const session = await requireAuth(accessToken);
  if (!session) {
    console.error(`[security] rbac: token failed validation for ${resource}:${action}, denying`);
    return false;
  }

  const allowed = can(session.role, resource, action);
  if (!allowed) {
    console.error(`[security] rbac: role "${session.role}" denied ${action} on ${resource} (user ${session.userId})`);
  }
  return allowed;
}

// Phase 40 gap-check — assertCan's soft-mode (missing token ⇒ allow) is a
// deliberate Phase 18 incremental-rollout choice for ordinary CRUD, but it's
// the wrong default for a resource whose actions mint or read standing
// credentials (API keys, webhook signing secrets) rather than just editing a
// CRM record — those grant durable programmatic access, a materially higher
// consequence than one row. assertCanStrict denies outright when no token is
// presented instead of soft-allowing, and otherwise defers to the exact same
// requireAuth()+can() check as assertCan. Used only by lib/actions/{apiKeys,
// webhooks}.ts — every other action keeps assertCan's existing soft mode.
export async function assertCanStrict(
  accessToken: string | undefined,
  resource: Resource | string,
  action: Action,
): Promise<boolean> {
  if (!accessToken) {
    console.error(`[security] rbac: no token supplied for high-sensitivity ${resource}:${action}, denying`);
    return false;
  }
  return assertCan(accessToken, resource, action);
}
