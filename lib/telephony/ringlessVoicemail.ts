// Phase 32 — Ringless Voicemail: drop a pre-recorded voicemail into a lead's
// inbox without ringing their phone. Provider-agnostic REST (Slybroadcast/
// Drop Cowboy-style HTTP gateways are the common shape: username/password +
// an audio URL + destination number). Real when configured, mock otherwise.
//
// SAME CAVEAT CLASS as lib/integrations/truecaller.ts: no single RVM
// provider is a de facto standard, and each has its own exact param names —
// re-verify this against whichever provider is actually chosen before
// relying on it in production. Requires carrier compliance registration
// too (see docs/GHL_PARITY_STATUS.md's "not achievable by code alone" table)
// — a provider account alone isn't enough to send real drops in most markets.

export interface RvmResult {
  ok: boolean;
  mock: boolean;
  detail?: string;
}

export async function dropRinglessVoicemail(phone: string, audioUrl: string): Promise<RvmResult> {
  const gatewayUrl = process.env.RVM_GATEWAY_URL;
  const username = process.env.RVM_USERNAME;
  const password = process.env.RVM_PASSWORD;

  if (!gatewayUrl || !username || !password) {
    console.log(`[telephony:rvm:mock] would drop voicemail to ${phone}: ${audioUrl}`);
    return { ok: true, mock: true, detail: "logged (mock) — RVM provider not configured" };
  }

  try {
    const body = new URLSearchParams({ c_uid: username, c_password: password, c_phone: phone, c_url: audioUrl });
    const res = await fetch(gatewayUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
    if (!res.ok) {
      console.error(`[telephony] ringless voicemail HTTP ${res.status}`);
      return { ok: false, mock: false, detail: `rvm ${res.status}` };
    }
    return { ok: true, mock: false };
  } catch (err) {
    console.error("[telephony] ringless voicemail error:", err);
    return { ok: false, mock: false, detail: String(err) };
  }
}
