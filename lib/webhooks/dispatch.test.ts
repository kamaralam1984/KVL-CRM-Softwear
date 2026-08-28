import { describe, it, expect } from "vitest";
import { dispatchWebhookEvent } from "./dispatch";

describe("dispatchWebhookEvent (Phase 40) — never throws", () => {
  it("resolves cleanly with no Supabase configured in this test env", async () => {
    await expect(dispatchWebhookEvent("lead.created", { id: 1, name: "Test Lead" })).resolves.toBeUndefined();
  });

  it("resolves cleanly for every event type", async () => {
    await expect(dispatchWebhookEvent("deal.won", { id: 1 })).resolves.toBeUndefined();
    await expect(dispatchWebhookEvent("order.paid", { id: "order_1" })).resolves.toBeUndefined();
  });
});
