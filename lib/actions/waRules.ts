"use server";
// Auto-reply rules — server actions for the Auto Reply tab (RBAC resource "automation").

import { getDb } from "@/lib/db";
import { assertCan } from "@/lib/security/requireAction";
import { getCommsSettings } from "@/lib/comms/settings";
import { isWithinBusinessHours, nextOpeningLabel } from "@/lib/comms/hours";
import { matchRule, renderRule, type AutoRule } from "@/lib/comms/rules";

const ok = (t: string | undefined, a: "read" | "create" | "update" | "delete") => assertCan(t, "automation", a);

export type AutoRuleInput = { id?: string; name: string; keywords: string; match: AutoRule["match"]; response: string; when_open: AutoRule["when_open"]; priority: number; active: boolean };

export async function listAutoRules(token?: string): Promise<AutoRule[]> {
  if (!(await ok(token, "read"))) return [];
  const { data } = await getDb().from("wa_auto_rules").select("*").order("priority").order("created_at").limit(500);
  return (data ?? []) as AutoRule[];
}

export async function saveAutoRule(r: AutoRuleInput, token?: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await ok(token, r.id ? "update" : "create"))) return { ok: false, error: "Forbidden" };
  if (!r.keywords.trim()) return { ok: false, error: "Add at least one keyword." };
  if (!r.response.trim()) return { ok: false, error: "Write the reply." };
  const row = { name: r.name.trim() || r.keywords.split(/[\n,|]/)[0].trim().slice(0, 40), keywords: r.keywords, match: r.match, response: r.response, when_open: r.when_open, priority: Math.max(1, Math.floor(r.priority) || 100), active: r.active };
  const q = r.id ? getDb().from("wa_auto_rules").update(row).eq("id", r.id) : getDb().from("wa_auto_rules").insert(row);
  const { error } = await q;
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function toggleAutoRule(id: string, active: boolean, token?: string): Promise<boolean> {
  if (!(await ok(token, "update"))) return false;
  const { error } = await getDb().from("wa_auto_rules").update({ active }).eq("id", id);
  return !error;
}

export async function deleteAutoRule(id: string, token?: string): Promise<boolean> {
  if (!(await ok(token, "delete"))) return false;
  const { error } = await getDb().from("wa_auto_rules").delete().eq("id", id);
  return !error;
}

/** "What would the bot answer to this message right now?" — no message is sent. */
export async function testAutoRules(message: string, token?: string): Promise<{ matched: boolean; rule?: string; reply?: string; open: boolean }> {
  if (!(await ok(token, "read"))) return { matched: false, open: true };
  const [s, { data }] = await Promise.all([getCommsSettings(), getDb().from("wa_auto_rules").select("*").eq("active", true)]);
  const open = isWithinBusinessHours(new Date(), s.business_hours);
  const rule = matchRule(message, (data ?? []) as AutoRule[], open);
  if (!rule) return { matched: false, open };
  return { matched: true, open, rule: rule.name, reply: renderRule(rule.response, { name: "Asha Sharma", bookingLink: s.links.bookingLink, paymentLink: s.links.paymentLink, opens: nextOpeningLabel(new Date(), s.business_hours) }) };
}
