// Click-to-call: Twilio rings the AGENT's phone first, then bridges to the lead (so the lead sees
// your business number and calls are logged + attributable). Without Twilio it degrades to a
// `tel:` link and a manual call-log row — the outcome form works either way.
//   env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, NEXT_PUBLIC_APP_URL
//   optional: CALL_RECORDING=true → records both legs + plays a consent notice to the lead.
import { getDb } from "@/lib/db";
import { isSuppressed } from "@/lib/compliance/dnc";
import { normalizePhone } from "@/lib/identity/resolve";

export interface StartCallResult { ok: boolean; mode: "twilio" | "manual"; callLogId?: string; tel?: string; detail?: string }

export async function startClickToCall(p: { leadId: number; agentPhone: string; agent?: string }): Promise<StartCallResult> {
  try {
    const db = getDb();
    const { data: lead } = await db.from("leads").select("id,name,phone").eq("id", p.leadId).maybeSingle();
    if (!lead?.phone) return { ok: false, mode: "manual", detail: "This lead has no phone number" };
    const to = normalizePhone(lead.phone as string);
    if (await isSuppressed({ phone: to }, "call")) return { ok: false, mode: "manual", detail: "Contact is on the Do-Not-Contact list" };

    const { data: log } = await db.from("call_logs").insert({
      direction: "outbound", from_number: p.agentPhone, to_number: to, lead_id: p.leadId, agent: p.agent ?? "", status: "initiated", is_ai_call: false,
    }).select("id").single();
    const callLogId = log?.id as string | undefined;

    const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN, from = process.env.TWILIO_FROM_NUMBER, app = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    if (!sid || !token || !from || !app || !p.agentPhone) {
      return { ok: true, mode: "manual", callLogId, tel: `tel:${to}`, detail: "Twilio not configured — dial manually, then log the outcome" };
    }

    const form = new URLSearchParams({
      To: normalizePhone(p.agentPhone), From: from,
      Url: `${app}/api/telephony/bridge?to=${encodeURIComponent(to)}&log=${callLogId ?? ""}&name=${encodeURIComponent(String(lead.name ?? ""))}`,
      StatusCallback: `${app}/api/telephony/call-status?log=${callLogId ?? ""}`, StatusCallbackEvent: "completed",
    });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
      method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form,
    });
    if (!res.ok) {
      console.error("[dialer] twilio call failed", res.status, await res.text().catch(() => ""));
      await db.from("call_logs").update({ status: "failed" }).eq("id", callLogId ?? "");
      return { ok: false, mode: "twilio", callLogId, detail: `Twilio ${res.status}` };
    }
    const j = (await res.json()) as { sid?: string };
    await db.from("call_logs").update({ provider_call_sid: j.sid ?? "", status: "ringing" }).eq("id", callLogId ?? "");
    return { ok: true, mode: "twilio", callLogId, detail: "Calling your phone now — answer to be connected" };
  } catch (err) {
    console.error("[dialer] startClickToCall failed:", err);
    return { ok: false, mode: "manual", detail: String(err) };
  }
}

