import { describe, it, expect, vi, afterEach } from "vitest";
import { assertCan } from "./requireAction";
import { makeDemoToken } from "./demoToken";

describe("assertCan — soft-mode rollout + demo tokens (Phase 18)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("allows (soft mode) when no token is supplied, and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    return assertCan(undefined, "finance", "delete").then((allowed) => {
      expect(allowed).toBe(true);
      expect(warn).toHaveBeenCalled();
    });
  });

  it("grants a demo-mode token that matches the role matrix", async () => {
    const token = makeDemoToken("sa", "Super Admin");
    expect(await assertCan(token, "finance", "delete")).toBe(true);
  });

  it("denies a demo-mode token whose role lacks the grant", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const token = makeDemoToken("u_viewer", "Viewer");
    expect(await assertCan(token, "finance", "delete")).toBe(false);
    expect(error).toHaveBeenCalled();
  });

  it("denies a garbage token that isn't demo-prefixed and can't be validated (no Supabase env in this test run)", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await assertCan("not-a-real-jwt", "finance", "read")).toBe(false);
    expect(error).toHaveBeenCalled();
  });
});
