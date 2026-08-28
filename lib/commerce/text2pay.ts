"use server";
// Phase 27 — Text-2-Pay: generate a Razorpay Payment Link, then deliver it
// over WhatsApp/SMS via Phase 21's real send (lib/messaging/send.ts) —
// exactly the GHL "Text-2-Pay" feature.

import { assertCan } from "@/lib/security/requireAction";
import { createRazorpayPaymentLink } from "@/lib/payments/razorpay";
import { sendWhatsApp, sendSms, isWhatsAppConfigured } from "@/lib/messaging/send";

export async function sendText2Pay(
  input: { phone: string; amountRupees: number; description: string; customerName?: string },
  accessToken?: string,
): Promise<{ ok: boolean; shortUrl?: string; mock: boolean }> {
  if (!(await assertCan(accessToken, "commerce", "create"))) return { ok: false, mock: false };
  if (!input.phone) return { ok: false, mock: false };

  const link = await createRazorpayPaymentLink(
    Math.round(input.amountRupees * 100),
    input.description,
    { name: input.customerName, contact: input.phone },
  );
  if (!link.ok || !link.shortUrl) return { ok: false, mock: link.mock };

  const message = `${input.description} — pay ₹${input.amountRupees} here: ${link.shortUrl}`;
  const sendResult = isWhatsAppConfigured() ? await sendWhatsApp(input.phone, message) : await sendSms(input.phone, message);

  return { ok: sendResult.ok, shortUrl: link.shortUrl, mock: link.mock || sendResult.mock };
}
