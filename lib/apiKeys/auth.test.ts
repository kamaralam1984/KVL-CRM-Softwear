import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { authenticateApiKey } from "./auth";

function reqWith(authHeader: string | null): NextRequest {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new NextRequest("https://example.com/api/v1/leads", { headers });
}

describe("authenticateApiKey (Phase 40)", () => {
  it("rejects a missing Authorization header", async () => {
    const result = await authenticateApiKey(reqWith(null));
    expect(result.ok).toBe(false);
  });

  it("rejects a non-Bearer Authorization header", async () => {
    const result = await authenticateApiKey(reqWith("Basic abc123"));
    expect(result.ok).toBe(false);
  });

  it("rejects a Bearer key that doesn't match any row (no Supabase configured in this test env)", async () => {
    const result = await authenticateApiKey(reqWith("Bearer kvl_live_nonexistent"));
    expect(result.ok).toBe(false);
  });
});
