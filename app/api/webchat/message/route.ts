// Phase 23 — Public Live-Chat Widget. POST /api/webchat/message — a visitor
// sends a message from the embedded widget (public/kvl-chat.js). Same trust
// model as /api/analytics/*: unauthenticated, protected by rate limiting +
// strict payload validation + site/origin allow-listing, not a bearer secret.

import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { resolveSiteFromRequest, jsonWithCors, corsPreflight } from "@/lib/sites/http";
import { isValidId, str, plainObject, rateLimitKey } from "../../analytics/shared";
import { ensureWebchatConversation, postWebchatVisitorMessage } from "@/lib/actions/conversations";

export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  try {
    const limit = rateLimit(rateLimitKey(req, "webchat-message"), 30, 60_000);
    if (!limit.allowed) {
      return jsonWithCors(origin, { ok: false, error: "rate_limited" }, 429);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonWithCors(origin, { ok: false, error: "invalid_json" }, 400);
    }
    const b = plainObject(body);

    const resolved = await resolveSiteFromRequest(req, b.site_id);
    if ("error" in resolved) return resolved.error;
    const { site } = resolved;

    const visitorId = b.visitor_id;
    if (!isValidId(visitorId)) {
      return jsonWithCors(origin, { ok: false, error: "invalid_visitor_id" }, 400);
    }
    const messageBody = str(b.body, 4000).trim();
    if (!messageBody) {
      return jsonWithCors(origin, { ok: false, error: "empty_message" }, 400);
    }
    const name = str(b.name, 120);

    const conversationId = await ensureWebchatConversation(site.site_id, visitorId as string, name);
    if (!conversationId) {
      return jsonWithCors(origin, { ok: false, error: "internal_error" }, 500);
    }
    await postWebchatVisitorMessage(conversationId, messageBody);

    return jsonWithCors(origin, { ok: true, conversation_id: conversationId });
  } catch (err) {
    console.error("[webchat] message route error:", err);
    return jsonWithCors(origin, { ok: false, error: "internal_error" }, 500);
  }
}
