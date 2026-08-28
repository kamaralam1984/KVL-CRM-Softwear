import { describe, it, expect } from "vitest";
import { generateQrDataUrl } from "./qr";

describe("generateQrDataUrl (Phase 32)", () => {
  it("returns a PNG data URI", async () => {
    const url = await generateQrDataUrl("https://rzp.io/l/example");
    expect(url).toMatch(/^data:image\/png;base64,/);
  });

  it("produces different output for different content", async () => {
    const a = await generateQrDataUrl("https://example.com/a");
    const b = await generateQrDataUrl("https://example.com/b");
    expect(a).not.toBe(b);
  });
});
