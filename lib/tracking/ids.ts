// Phase 17 — Lead Intelligence & Acquisition Engine, Wave 1 (Foundation)
// First-party, non-invasive ID generation. Works in browser, Node and Edge
// runtimes — `crypto.randomUUID()` is available in all three, no new dependency.

function shortHex(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
}

export function generateVisitorId(): string {
  return `KV-V-${shortHex()}`;
}

export function generateSessionId(): string {
  return `KV-S-${shortHex()}`;
}
