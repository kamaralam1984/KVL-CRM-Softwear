import { describe, it, expect } from "vitest";
import { makeDemoToken, parseDemoToken, DEMO_TOKEN_PREFIX } from "./demoToken";

describe("demoToken", () => {
  it("round-trips a userId + role", () => {
    const token = makeDemoToken("u_1", "Admin");
    expect(token.startsWith(DEMO_TOKEN_PREFIX)).toBe(true);
    expect(parseDemoToken(token)).toEqual({ userId: "u_1", role: "Admin" });
  });

  it("round-trips a role containing a space", () => {
    const token = makeDemoToken("sa", "Super Admin");
    expect(parseDemoToken(token)).toEqual({ userId: "sa", role: "Super Admin" });
  });

  it("returns null for a non-demo token", () => {
    expect(parseDemoToken("eyJhbGciOiJIUzI1NiJ9.real.jwt")).toBeNull();
  });

  it("returns null for a malformed demo token", () => {
    expect(parseDemoToken("demo:")).toBeNull();
    expect(parseDemoToken("demo:onlyuser")).toBeNull();
  });
});
