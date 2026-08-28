import { describe, it, expect } from "vitest";
import { getMissedCallReplyTemplate, sendMissedCallAutoReply } from "./autoReply";

describe("Missed-Call Auto Text-Back (Phase 22)", () => {
  it("falls back to the default template when Supabase isn't configured in this env", async () => {
    const template = await getMissedCallReplyTemplate();
    expect(typeof template).toBe("string");
    expect(template.length).toBeGreaterThan(0);
  });

  it("sendMissedCallAutoReply never throws even with no provider configured", async () => {
    await expect(sendMissedCallAutoReply("+919812345678")).resolves.toBeUndefined();
  });
});
