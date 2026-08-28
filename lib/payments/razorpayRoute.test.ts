import { describe, it, expect } from "vitest";
import { isRazorpayXConfigured, createFundAccount, createPayout } from "./razorpayRoute";

describe("razorpayRoute (Phase 36) — mock fallback, never throws", () => {
  it("isRazorpayXConfigured is false when RAZORPAYX_* isn't set in this test env", () => {
    expect(isRazorpayXConfigured()).toBe(false);
  });

  it("createFundAccount mocks when unconfigured", async () => {
    const result = await createFundAccount("Jane Affiliate", "jane@example.com", "", "jane@upi");
    expect(result.ok).toBe(true);
    expect(result.mock).toBe(true);
    expect(result.fundAccountId).toMatch(/^fa_mock_/);
  });

  it("createPayout mocks when unconfigured", async () => {
    const result = await createPayout("fa_mock_abc", 5000, "commission-1", "Affiliate commission");
    expect(result.ok).toBe(true);
    expect(result.mock).toBe(true);
  });

  it("createPayout mocks a mock fund account even if somehow called directly with one", async () => {
    const result = await createPayout("fa_mock_xyz", 1000, "ref", "note");
    expect(result.mock).toBe(true);
  });
});
