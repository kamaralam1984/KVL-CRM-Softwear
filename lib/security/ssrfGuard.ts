// Phase 40 gap-check fix — lib/webhooks/dispatch.ts fetches a user-supplied
// endpoint_url directly, the first user-supplied-URL fetch in this codebase
// (every other server-side fetch elsewhere targets a fixed/env-configured
// host). Resolves the hostname and rejects loopback/private/link-local
// targets before the real fetch — checked both when a webhook is CREATED
// (lib/actions/webhooks.ts) and again at DISPATCH time (lib/webhooks/
// dispatch.ts), since DNS can change between those two moments (rebinding).
// Fails closed: any resolution error is treated as unsafe, never allowed.

import { lookup } from "dns/promises";

function isPrivateOrLoopbackIp(ip: string, family: number): boolean {
  if (family === 4) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
    const [a, b] = parts;
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata)
    if (a === 0) return true; // "this network"
    return false;
  }
  // IPv6
  const lower = ip.toLowerCase();
  if (lower === "::1") return true; // loopback
  if (lower.startsWith("fe80:")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local (fc00::/7)
  if (lower.startsWith("::ffff:")) return isPrivateOrLoopbackIp(lower.slice(7), 4); // IPv4-mapped
  return false;
}

export async function isSafeWebhookUrl(rawUrl: string): Promise<boolean> {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;

    const hostname = url.hostname.toLowerCase();
    if (hostname === "localhost" || hostname.endsWith(".localhost")) return false;

    const { address, family } = await lookup(hostname);
    if (isPrivateOrLoopbackIp(address, family)) return false;

    return true;
  } catch (err) {
    console.error("[security] isSafeWebhookUrl resolution failed, treating as unsafe:", err);
    return false;
  }
}
