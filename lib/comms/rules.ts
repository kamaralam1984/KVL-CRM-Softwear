// Keyword auto-reply rules (wa_auto_rules). Evaluated on every inbound WhatsApp message before the AI answer /
// off-hours reply. Pure matching + rendering live here so they are unit-testable; DB access is at the bottom.

import { getDb } from "@/lib/db";

export interface AutoRule {
  id: string; name: string; keywords: string; match: "contains" | "exact" | "starts";
  response: string; when_open: "always" | "off_hours" | "in_hours"; priority: number; active: boolean; hits: number;
}

const norm = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const splitKeywords = (k: string) => k.split(/[\n,|]/).map(norm).filter(Boolean);

function keywordHit(text: string, kw: string, mode: AutoRule["match"]): boolean {
  if (mode === "exact") return text === kw;
  if (mode === "starts") return text.startsWith(kw);
  // contains: whole-word for ordinary words (so "pay" doesn't fire on "payal"), plain substring for phrases with symbols/non-latin
  return /^[a-z0-9 ]+$/.test(kw) ? new RegExp(`(^|[^a-z0-9])${esc(kw)}($|[^a-z0-9])`).test(text) : text.includes(kw);
}

/** First matching rule by priority (lower first), honouring the business-hours condition. */
export function matchRule(message: string, rules: AutoRule[], withinHours: boolean): AutoRule | null {
  const text = norm(message);
  if (!text) return null;
  const ordered = [...rules].filter((r) => r.active && r.response.trim()).sort((a, b) => a.priority - b.priority);
  for (const r of ordered) {
    if (r.when_open === "off_hours" && withinHours) continue;
    if (r.when_open === "in_hours" && !withinHours) continue;
    if (splitKeywords(r.keywords).some((kw) => keywordHit(text, kw, r.match))) return r;
  }
  return null;
}

export function renderRule(response: string, v: { name?: string; bookingLink?: string; paymentLink?: string; opens?: string }): string {
  const name = (v.name ?? "").trim();
  return response
    .replace(/\{\{\s*firstName\s*\}\}/gi, name.split(/\s+/)[0] ?? "")
    .replace(/\{\{\s*name\s*\}\}/gi, name)
    .replace(/\{\{\s*bookingLink\s*\}\}/gi, v.bookingLink ?? "")
    .replace(/\{\{\s*paymentLink\s*\}\}/gi, v.paymentLink ?? "")
    .replace(/\{\{\s*opens\s*\}\}/gi, v.opens ?? "")
    .replace(/[ \t]+\n/g, "\n").trim();
}

export async function listActiveRules(): Promise<AutoRule[]> {
  try {
    const { data } = await getDb().from("wa_auto_rules").select("*").eq("active", true).order("priority").limit(200);
    return (data ?? []) as AutoRule[];
  } catch (err) { console.error("[comms] listActiveRules failed:", err); return []; }
}

export async function bumpRuleHit(id: string, current: number): Promise<void> {
  try { await getDb().from("wa_auto_rules").update({ hits: current + 1, last_hit_at: new Date().toISOString() }).eq("id", id); } catch { /* counter only */ }
}
