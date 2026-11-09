import { describe, it, expect } from "vitest";
import { whatsappProvider, waDigits, sendWhatsAppCloud, sendWhatsAppQr } from "./whatsappProviders";

describe("whatsappProvider selection", () => {
  it("defaults to twilio when nothing is configured", () => expect(whatsappProvider({} as NodeJS.ProcessEnv)).toBe("twilio"));
  it("auto-detects Cloud API", () =>
    expect(whatsappProvider({ WHATSAPP_CLOUD_TOKEN: "t", WHATSAPP_CLOUD_PHONE_NUMBER_ID: "1" } as unknown as NodeJS.ProcessEnv)).toBe("cloud"));
  it("auto-detects QR service", () =>
    expect(whatsappProvider({ WHATSAPP_QR_URL: "http://x", WHATSAPP_QR_SECRET: "s" } as unknown as NodeJS.ProcessEnv)).toBe("qr"));
  it("WHATSAPP_PROVIDER overrides auto-detection (the switch)", () =>
    expect(whatsappProvider({ WHATSAPP_PROVIDER: "qr", WHATSAPP_CLOUD_TOKEN: "t", WHATSAPP_CLOUD_PHONE_NUMBER_ID: "1" } as unknown as NodeJS.ProcessEnv)).toBe("qr"));
  it("ignores an invalid override", () => expect(whatsappProvider({ WHATSAPP_PROVIDER: "bogus" } as unknown as NodeJS.ProcessEnv)).toBe("twilio"));
});

describe("waDigits", () => {
  it.each([["+91 98123-45678", "919812345678"], ["whatsapp:+919812345678", "919812345678"], ["919812345678", "919812345678"]])("%s → %s", (i, o) => expect(waDigits(i)).toBe(o));
});

describe("own-number senders mock safely when unconfigured", () => {
  it("cloud", async () => { const r = await sendWhatsAppCloud("+919812345678", "hi"); expect(r.ok && r.mock).toBe(true); });
  it("qr", async () => { const r = await sendWhatsAppQr("+919812345678", "hi"); expect(r.ok && r.mock).toBe(true); });
});
