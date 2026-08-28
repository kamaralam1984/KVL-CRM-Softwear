// Phase 32 — QR Code generator. A QR code is a well-defined rendering
// algorithm (Reed-Solomon error correction + module matrix), not an external
// API call — this is the one place in the "utility batch" where a small,
// battle-tested package (qrcode, zero further deps, no network calls) is a
// better trade than hand-rolling: a broken QR code is a broken payment link.
// Used directly by Phase 27's Tap-2-Pay.

import QRCode from "qrcode";

/** Returns a data: URI (PNG) — safe to drop straight into an <img src>. */
export async function generateQrDataUrl(content: string): Promise<string> {
  return QRCode.toDataURL(content, { margin: 1, width: 320, color: { dark: "#0D0D0D", light: "#FFFFFF" } });
}
