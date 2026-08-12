// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 1 (Foundation)
// Shared helpers for the /api/analytics/* collection routes. These endpoints
// are called directly by anonymous browsers, so — unlike the cron-secret
// bearer auth used by /api/scoring, /api/leadgen etc. — there is no shared
// secret to check. Protection here is: strict payload validation, a hard cap
// on batch size, and per-IP rate limiting.

import { NextRequest } from "next/server";

export const MAX_EVENTS_PER_BATCH = 25;
const ID_PATTERN = /^KV-[A-Z]-[A-F0-9]{6,32}$/;

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

export function rateLimitKey(req: NextRequest, route: string): string {
  return `analytics:${route}:${clientIp(req)}`;
}

export function isValidId(value: unknown): value is string {
  return typeof value === "string" && value.length <= 64 && ID_PATTERN.test(value);
}

export function str(value: unknown, maxLen = 512): string {
  return typeof value === "string" ? value.slice(0, maxLen) : "";
}

export function plainObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}
