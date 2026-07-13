// Phase 15 — Enterprise Security: In-memory fixed-window rate limiter.
// Map-based, process-local. Suitable for a single Node server instance
// (Next.js route handlers). Prunes expired windows lazily and opportunistically.

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Epoch millis when the current window resets. */
  resetAt: number;
  limit: number;
}

interface WindowState {
  count: number;
  resetAt: number;
}

// Keyed per limiter subject (e.g. an IP, user id, or route+IP composite).
const buckets = new Map<string, WindowState>();

// Prune bookkeeping — avoid scanning the whole Map on every call.
let lastPrune = 0;
const PRUNE_INTERVAL_MS = 60_000;

function prune(now: number): void {
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  for (const [key, state] of buckets) {
    if (state.resetAt <= now) buckets.delete(key);
  }
}

/**
 * rateLimit — consume one token for `key`.
 * @param key    unique subject identifier.
 * @param limit  max requests per window (default 60).
 * @param windowMs window length in ms (default 60000).
 * @returns whether the request is allowed and how many tokens remain.
 * Never throws — on internal error it fails OPEN (allows) to avoid lockout.
 */
export function rateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
): RateLimitResult {
  try {
    const now = Date.now();
    prune(now);

    let state = buckets.get(key);
    if (!state || state.resetAt <= now) {
      state = { count: 0, resetAt: now + windowMs };
      buckets.set(key, state);
    }

    state.count += 1;
    const over = state.count > limit;
    const remaining = Math.max(0, limit - state.count);

    return {
      allowed: !over,
      remaining,
      resetAt: state.resetAt,
      limit,
    };
  } catch (err) {
    console.error("[security] rateLimit failed", err);
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs, limit };
  }
}

/** resetRateLimit — clear one key (e.g. after successful auth). */
export function resetRateLimit(key: string): void {
  try {
    buckets.delete(key);
  } catch (err) {
    console.error("[security] resetRateLimit failed", err);
  }
}

/** clearAllRateLimits — wipe every bucket (mainly for tests). */
export function clearAllRateLimits(): void {
  try {
    buckets.clear();
    lastPrune = 0;
  } catch (err) {
    console.error("[security] clearAllRateLimits failed", err);
  }
}
