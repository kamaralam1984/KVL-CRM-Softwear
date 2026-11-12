// Pure helpers shared by the Broadcast UI and engine (no DB, safe in client components):
// IST send-window logic, delivery-time estimate, and deterministic spintax.

/** Current hour (0–23) in IST. */
export function istHour(now = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }).format(now)) % 24;
}

/** Is `now` inside the [start, end) IST window? null / equal bounds = always open. Supports overnight windows (22 → 6). */
export function inSendWindow(start: unknown, end: unknown, now = new Date()): boolean {
  if (start == null || end == null) return true;
  const s = Number(start), e = Number(end);
  if (!Number.isFinite(s) || !Number.isFinite(e) || s === e) return true;
  const h = istHour(now);
  return s < e ? h >= s && h < e : h >= s || h < e;
}

/** Whole minutes to send `count` messages at the QR service's 4–9 s pacing (+ typing delay). 0 when there is nothing to send. */
export function etaMinutes(count: number, avgSecondsPerMessage = 8): number {
  return count > 0 ? Math.max(1, Math.round((count * avgSecondsPerMessage) / 60)) : 0;
}
export function formatEta(min: number): string {
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
}

/** Small stable string hash (FNV-1a) → uint32. */
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/**
 * Spintax: "{Hi|Hello|Namaste} Asha" → one variant. The pick is DETERMINISTIC for (text, seed) so the message
 * we log is exactly the message we sent, and a retry of the same recipient reads the same. Different seeds
 * (e.g. each recipient's phone) spread across the variants. `{{merge}}` tags are untouched (they contain no "|").
 */
export function spin(text: string, seed: string): string {
  let n = 0;
  return text.replace(/\{([^{}|]+(?:\|[^{}|]*)+)\}/g, (_m, inner: string) => {
    const opts = inner.split("|");
    return opts[hash(`${seed}#${n++}`) % opts.length];
  });
}

/** How many distinct messages the spintax in `text` can produce (1 = none). */
export function spinVariants(text: string): number {
  let total = 1;
  for (const m of text.matchAll(/\{([^{}|]+(?:\|[^{}|]*)+)\}/g)) total *= m[1].split("|").length;
  return total;
}
