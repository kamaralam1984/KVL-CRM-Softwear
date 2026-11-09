// Email delivery/engagement events (Resend webhooks) + inbound email handling.
// bounce / complaint → central DNC; open / click → counters + hot-lead alert; inbound → drip pause + team alert.
import { getServerClient } from "@/lib/supabase/server";
import { addSuppression, removeSuppression } from "@/lib/compliance/dnc";
import { notifyTeam } from "@/lib/notify/team";
import { handleInboundReply, findLeadIds } from "@/lib/followup/engine";
import { classifyInbound } from "@/lib/followup/sequence";

const RANK: Record<string, number> = { mock: 0, sent: 1, delivered: 2 };

interface EmailEventData { email_id?: string; to?: string[] | string; bounce?: { type?: string; subType?: string; message?: string }; click?: { link?: string } }

const first = (v: string[] | string | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function applyEmailEvent(type: string, data: EmailEventData): Promise<void> {
  const id = data.email_id;
  if (!id) return;
  try {
    const db = getServerClient();
    const { data: row } = await db.from("email_log").select("id,status,opens,clicks,lead_id,to_email,subject").eq("provider_id", id).maybeSingle();
    if (!row) return;
    const to = (row.to_email as string) || first(data.to);
    const lead = row.lead_id as number | null;

    if (type === "email.delivered") {
      if ((RANK[row.status as string] ?? 0) < 2 && !["bounced", "complained"].includes(row.status as string)) await db.from("email_log").update({ status: "delivered" }).eq("id", row.id);
    } else if (type === "email.bounced") {
      const soft = /transient|temporary|soft/i.test(`${data.bounce?.type ?? ""} ${data.bounce?.subType ?? ""}`);
      await db.from("email_log").update({ status: "bounced", error: (data.bounce?.message ?? data.bounce?.type ?? "bounced").slice(0, 300) }).eq("id", row.id);
      if (!soft) await addSuppression({ email: to }, { channel: "email", reason: "Hard bounce", source: "bounce" });
      await notifyTeam({ kind: "email_bounced", leadId: lead ?? undefined, priority: "normal", title: `Email to ${to} bounced`, body: soft ? "Temporary failure — will retry on next touch." : "Permanent failure — address added to the do-not-email list." });
    } else if (type === "email.complained") {
      await db.from("email_log").update({ status: "complained" }).eq("id", row.id);
      await addSuppression({ email: to }, { channel: "all", reason: "Marked as spam", source: "complaint" });
      await notifyTeam({ kind: "email_complaint", leadId: lead ?? undefined, priority: "high", title: `${to} marked our email as spam`, body: "Contact added to the global do-not-contact list." });
    } else if (type === "email.opened") {
      await db.from("email_log").update({ opens: (row.opens as number) + 1 }).eq("id", row.id);
    } else if (type === "email.clicked") {
      await db.from("email_log").update({ clicks: (row.clicks as number) + 1 }).eq("id", row.id);
      if ((row.clicks as number) === 0) {
        await notifyTeam({ kind: "email_click", leadId: lead ?? undefined, priority: "normal", title: `🔥 ${to} clicked a link in "${String(row.subject ?? "").slice(0, 60)}"`, body: data.click?.link ?? "" });
      }
    }
  } catch (err) { console.error("[email] applyEmailEvent failed:", err); }
}

// ── Inbound ──────────────────────────────────────────────────────────────────

/** "Name <a@b.com>" → "a@b.com" */
export function parseAddress(raw: string): string {
  const m = raw.match(/<([^>]+)>/);
  return (m ? m[1] : raw).trim().toLowerCase();
}

/** Strips quoted history so only the client's NEW text is classified. */
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  for (const l of lines) {
    if (/^\s*>/.test(l) || /^On .{5,120} wrote:\s*$/i.test(l.trim()) || /^-{2,}\s*Original Message/i.test(l.trim()) || /^From:\s.+@/i.test(l.trim())) break;
    out.push(l);
  }
  return out.join("\n").trim();
}

const AUTO_REPLY = /out of office|automatic reply|auto.?reply|autoreply|vacation|delivery status notification|undeliverable/i;

export async function processInboundEmail(p: { from: string; to?: string; subject?: string; text?: string; html?: string; messageId?: string }): Promise<{ handled: boolean }> {
  try {
    const email = parseAddress(p.from);
    if (!email.includes("@")) return { handled: false };
    const plain = p.text || (p.html ?? "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
    const body = stripQuoted(plain).slice(0, 4000) || (p.subject ?? "");
    const db = getServerClient();
    const [leadId] = await findLeadIds({ email });

    await db.from("email_log").insert({
      direction: "inbound", provider_id: p.messageId ?? null, thread_key: email, lead_id: leadId ?? null,
      from_email: email, to_email: p.to ?? "", subject: (p.subject ?? "").slice(0, 300), body, status: "received",
    });

    if (AUTO_REPLY.test(`${p.subject ?? ""} ${body.slice(0, 200)}`)) return { handled: true }; // logged, but not a human reply
    if (/^\s*(start|subscribe|resume)\s*$/i.test(body)) { await removeSuppression({ email }); return { handled: true }; }
    if (classifyInbound(body) === "optout") await addSuppression({ email }, { channel: "all", reason: body.slice(0, 80), source: "inbound_stop" });
    await handleInboundReply({ email, leadId }, body, "Email");
    return { handled: true };
  } catch (err) { console.error("[email] processInboundEmail failed:", err); return { handled: false }; }
}

/** Resend's `email.received` webhook carries metadata only; fetch the body. Best-effort. */
export async function fetchResendReceivedBody(emailId: string): Promise<{ text?: string; html?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return {};
  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) return {};
    const j = (await res.json()) as { text?: string; html?: string };
    return { text: j.text, html: j.html };
  } catch { return {}; }
}
