// Phase 23 — Public Live-Chat Widget. GET /api/webchat/poll — the widget
// (public/kvl-chat.js) polls this every few seconds while its panel is open
// for new agent replies. No websocket/Realtime infra exists in this codebase;
// polling is the same honest choice already made elsewhere (see
// lib/actions/conversations.ts::getWebchatMessagesSince's comment).

import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { resolveSiteFromRequest, jsonWithCors, corsPreflight } from "@/lib/sites/http";
import { isValidId, rateLimitKey } from "../../analytics/shared";
import { verifyWebchatConversationOwnership, getWebchatMessagesSince } from "@/lib/actions/conversations";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  try {
    const limit = rateLimit(rateLimitKey(req, "webchat-poll"), 60, 60_000);
    if (!limit.allowed) {
      return jsonWithCors(origin, { ok: false, error: "rate_limited" }, 429);
    }

    const { searchParams } = req.nextUrl;
    const resolved = await resolveSiteFromRequest(req, searchParams.get("site_id"));
    if ("error" in resolved) return resolved.error;
    const { site } = resolved;

    const visitorId = searchParams.get("visitor_id");
    const conversationId = searchParams.get("conversation_id");
    if (!isValidId(visitorId) || !conversationId) {
      return jsonWithCors(origin, { ok: false, error: "invalid_params" }, 400);
    }

    const owns = await verifyWebchatConversationOwnership(conversationId, site.site_id, visitorId as string);
    if (!owns) {
      return jsonWithCors(origin, { ok: false, error: "not_found" }, 404);
    }

    const since = searchParams.get("since") || new Date(0).toISOString();
    const messages = await getWebchatMessagesSince(conversationId, since);

    return jsonWithCors(origin, { ok: true, messages });
  } catch (err) {
    console.error("[webchat] poll route error:", err);
    return jsonWithCors(origin, { ok: false, error: "internal_error" }, 500);
  }
}
