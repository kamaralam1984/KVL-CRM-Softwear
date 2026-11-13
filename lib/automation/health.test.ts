import { describe, it, expect } from "vitest";
import { crossedHealthThreshold } from "./health";

describe("crossedHealthThreshold", () => {
  it("fires only when health falls from >= 60 to < 60", () => {
    expect(crossedHealthThreshold(80, 55)).toBe(true);
    expect(crossedHealthThreshold(60, 59)).toBe(true);
  });
  it("does not fire on small dips that stay >= 60, on recovery, or when already low", () => {
    expect(crossedHealthThreshold(90, 70)).toBe(false);
    expect(crossedHealthThreshold(40, 20)).toBe(false);
    expect(crossedHealthThreshold(50, 80)).toBe(false);
    expect(crossedHealthThreshold(60, 60)).toBe(false);
  });
  it("ignores unknown previous/next values", () => {
    expect(crossedHealthThreshold(null, 10)).toBe(false);
    expect(crossedHealthThreshold(80, undefined)).toBe(false);
  });
});
