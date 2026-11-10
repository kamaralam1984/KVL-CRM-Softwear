import { describe, it, expect } from "vitest";
import { maskWaConfig, EMPTY_WA_CONFIG } from "./config";

describe("maskWaConfig", () => {
  it("hides secrets but keeps the last 4 characters, leaves non-secrets", () => {
    const c = JSON.parse(JSON.stringify(EMPTY_WA_CONFIG));
    c.cloud.token = "EAAGsecret1234"; c.cloud.phoneNumberId = "555"; c.qr.secret = "abcdefghijklmnopqrst";
    const m = maskWaConfig(c);
    expect(m.cloud.token).toBe("••••1234");
    expect(m.qr.secret).toBe("••••qrst");
    expect(m.cloud.phoneNumberId).toBe("555");
    expect(c.cloud.token).toBe("EAAGsecret1234"); // original untouched
  });
  it("shows empty secrets as empty", () => expect(maskWaConfig(EMPTY_WA_CONFIG).cloud.token).toBe(""));
});
