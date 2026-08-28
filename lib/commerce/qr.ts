"use server";
// Phase 32 — Tap-2-Pay: a QR code a customer scans in person to pay. Reuses
// Phase 27's Razorpay Payment Link (same underlying charge, different
// delivery — a scannable code instead of a WhatsApp/SMS text) + Phase 32's
// QR utility for the actual image.

import { assertCan } from "@/lib/security/requireAction";
import { createRazorpayPaymentLink } from "@/lib/payments/razorpay";
import { generateQrDataUrl } from "@/lib/utils/qr";

export async function generateTapToPayQr(
  input: { amountRupees: number; description: string },
  accessToken?: string,
): Promise<{ ok: boolean; qrDataUrl?: string; shortUrl?: string; mock: boolean }> {
  if (!(await assertCan(accessToken, "commerce", "create"))) return { ok: false, mock: false };

  const link = await createRazorpayPaymentLink(Math.round(input.amountRupees * 100), input.description, {});
  if (!link.ok || !link.shortUrl) return { ok: false, mock: link.mock };

  const qrDataUrl = await generateQrDataUrl(link.shortUrl);
  return { ok: true, qrDataUrl, shortUrl: link.shortUrl, mock: link.mock };
}
