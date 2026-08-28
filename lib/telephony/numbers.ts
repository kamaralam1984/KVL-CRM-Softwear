// Phase 41 — Call Tracking (Dynamic Number Insertion). Real Twilio
// IncomingPhoneNumbers search-and-buy REST call when Twilio creds are set —
// mock-assigns a fake number otherwise, same real-else-mock convention as
// every other integration here. `appBaseUrl` is passed in from the client
// (window.location.origin), same pattern lib/actions/integrations.ts's
// getRazorpayConnectUrl already uses — server actions have no reliable way
// to know their own public URL otherwise.

export interface ProvisionNumberResult {
  ok: boolean;
  mock: boolean;
  phoneNumber?: string;
  twilioSid?: string;
  detail?: string;
}

function authHeader(): string | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
}

export function isTwilioNumberProvisioningConfigured(): boolean {
  return authHeader() !== null;
}

export async function provisionTrackingNumber(areaCode: string, appBaseUrl: string): Promise<ProvisionNumberResult> {
  const auth = authHeader();
  const sid = process.env.TWILIO_ACCOUNT_SID;
  if (!auth || !sid) {
    const mockNumber = `+1555${areaCode.padStart(3, "0")}${Math.floor(1000 + Math.random() * 9000)}`;
    console.log(`[telephony:numbers:mock] provisioned tracking number ${mockNumber}`);
    return { ok: true, mock: true, phoneNumber: mockNumber, twilioSid: `PN_mock_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}` };
  }

  try {
    const searchRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/AvailablePhoneNumbers/US/Local.json?AreaCode=${encodeURIComponent(areaCode)}&Limit=1`,
      { headers: { Authorization: auth } },
    );
    if (!searchRes.ok) {
      console.error(`[telephony] number search HTTP ${searchRes.status}`);
      return { ok: false, mock: false, detail: `twilio search ${searchRes.status}` };
    }
    const searchJson = (await searchRes.json()) as { available_phone_numbers?: { phone_number?: string }[] };
    const found = searchJson.available_phone_numbers?.[0]?.phone_number;
    if (!found) return { ok: false, mock: false, detail: "no numbers available for that area code" };

    const voiceUrl = `${appBaseUrl}/api/telephony/inbound-call`;
    const purchaseRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers.json`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ PhoneNumber: found, VoiceUrl: voiceUrl, VoiceMethod: "POST" }),
    });
    if (!purchaseRes.ok) {
      console.error(`[telephony] number purchase HTTP ${purchaseRes.status}`);
      return { ok: false, mock: false, detail: `twilio purchase ${purchaseRes.status}` };
    }
    const purchaseJson = (await purchaseRes.json()) as { sid?: string; phone_number?: string };
    return { ok: true, mock: false, phoneNumber: purchaseJson.phone_number ?? found, twilioSid: purchaseJson.sid };
  } catch (err) {
    console.error("[telephony] provisionTrackingNumber error:", err);
    return { ok: false, mock: false, detail: String(err) };
  }
}
