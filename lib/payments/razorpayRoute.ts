// Phase 36 — Affiliate Payout Automation. Extends lib/payments/razorpay.ts's
// hand-rolled-REST/authHeader() pattern to RazorpayX's Contacts/Fund
// Accounts/Payouts APIs — the actual money-movement product behind
// affiliate commission payouts (GHL calls this "Route").
//
// IMPORTANT credential distinction (same discipline as razorpay.ts's Connect-
// vs-Orders split): RAZORPAYX_KEY_ID/SECRET are a separate credential pair
// from RAZORPAY_KEY_ID/SECRET (Orders/Payment Links) — RazorpayX is a
// distinct product with its own dashboard-issued keys, plus a required
// RAZORPAYX_ACCOUNT_NUMBER identifying which virtual/current account payouts
// draw from. Never conflate these three with the Orders key pair or the
// Connect OAuth credential.
//
// Not marked "use server" for the same reason as razorpay.ts: exports a
// synchronous isRazorpayXConfigured() helper, which that directive forbids.

function authHeader(): string | null {
  const keyId = process.env.RAZORPAYX_KEY_ID;
  const keySecret = process.env.RAZORPAYX_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export function isRazorpayXConfigured(): boolean {
  return authHeader() !== null && Boolean(process.env.RAZORPAYX_ACCOUNT_NUMBER);
}

export interface FundAccountResult {
  ok: boolean;
  mock: boolean;
  contactId?: string;
  fundAccountId?: string;
  detail?: string;
}

// Two-step RazorpayX setup: a Contact (the payee) must exist before a Fund
// Account (where their money goes) can be created against it. VPA (UPI) is
// the payout method here — simpler to collect than full bank account +
// IFSC, and RazorpayX supports UPI payouts natively.
export async function createFundAccount(
  name: string,
  email: string,
  contactPhone: string,
  vpa: string,
): Promise<FundAccountResult> {
  const auth = authHeader();
  if (!auth) {
    console.log(`[payments:razorpayx:mock] fund account for "${name}" (vpa ${vpa})`);
    return { ok: true, mock: true, contactId: `cont_mock_${Date.now().toString(36)}`, fundAccountId: `fa_mock_${Date.now().toString(36)}` };
  }
  try {
    const contactRes = await fetch("https://api.razorpay.com/v1/contacts", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name, email: email || undefined, contact: contactPhone || undefined, type: "vendor" }),
    });
    if (!contactRes.ok) {
      console.error(`[payments] razorpayx createContact HTTP ${contactRes.status}`);
      return { ok: false, mock: false, detail: `razorpayx contact ${contactRes.status}` };
    }
    const contact = (await contactRes.json()) as { id?: string };
    if (!contact.id) return { ok: false, mock: false, detail: "razorpayx: no contact id returned" };

    const faRes = await fetch("https://api.razorpay.com/v1/fund_accounts", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: contact.id, account_type: "vpa", vpa: { address: vpa } }),
    });
    if (!faRes.ok) {
      console.error(`[payments] razorpayx createFundAccount HTTP ${faRes.status}`);
      return { ok: false, mock: false, detail: `razorpayx fund_account ${faRes.status}` };
    }
    const fa = (await faRes.json()) as { id?: string };
    return { ok: true, mock: false, contactId: contact.id, fundAccountId: fa.id };
  } catch (err) {
    console.error("[payments] razorpayx createFundAccount error:", err);
    return { ok: false, mock: false, detail: String(err) };
  }
}

export interface PayoutResult {
  ok: boolean;
  mock: boolean;
  payoutId?: string;
  status?: string;
  detail?: string;
}

export async function createPayout(fundAccountId: string, amountPaise: number, referenceId: string, narration: string): Promise<PayoutResult> {
  const auth = authHeader();
  const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;
  if (!auth || !accountNumber || fundAccountId.startsWith("fa_mock_")) {
    console.log(`[payments:razorpayx:mock] payout ₹${amountPaise / 100} to fund account "${fundAccountId}"`);
    return { ok: true, mock: true, payoutId: `pout_mock_${Date.now().toString(36)}`, status: "processed" };
  }
  try {
    const res = await fetch("https://api.razorpay.com/v1/payouts", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        account_number: accountNumber,
        fund_account_id: fundAccountId,
        amount: amountPaise,
        currency: "INR",
        mode: "UPI",
        purpose: "payout",
        queue_if_low_balance: true,
        reference_id: referenceId,
        narration,
      }),
    });
    if (!res.ok) {
      console.error(`[payments] razorpayx createPayout HTTP ${res.status}`);
      return { ok: false, mock: false, detail: `razorpayx payout ${res.status}` };
    }
    const j = (await res.json()) as { id?: string; status?: string };
    return { ok: true, mock: false, payoutId: j.id, status: j.status };
  } catch (err) {
    console.error("[payments] razorpayx createPayout error:", err);
    return { ok: false, mock: false, detail: String(err) };
  }
}
