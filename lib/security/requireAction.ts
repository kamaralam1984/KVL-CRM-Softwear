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
