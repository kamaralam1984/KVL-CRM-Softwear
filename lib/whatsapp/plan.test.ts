import { describe, it, expect } from "vitest";
import { inSendWindow, istHour, etaMinutes, formatEta, spin, spinVariants } from "./plan";

// 2026-11-12 15:05 UTC = 20:35 IST
const at2035 = new Date("2026-11-12T15:05:00Z");

describe("istHour / inSendWindow", () => {
  it("converts UTC to IST", () => expect(istHour(at2035)).toBe(20));
  it("20:35 is outside 9–20", () => expect(inSendWindow(9, 20, at2035)).toBe(false));
  it("20:35 is inside 9–21", () => expect(inSendWindow(9, 21, at2035)).toBe(true));
  it("supports overnight windows", () => { expect(inSendWindow(19, 6, at2035)).toBe(true); expect(inSendWindow(21, 6, at2035)).toBe(false); });
  it("null or equal bounds = always open", () => { expect(inSendWindow(null, null, at2035)).toBe(true); expect(inSendWindow(9, 9, at2035)).toBe(true); });
});

describe("eta", () => {
  it("is 0 for nothing, at least 1 otherwise", () => { expect(etaMinutes(0)).toBe(0); expect(etaMinutes(1)).toBe(1); });
  it("scales with count", () => expect(etaMinutes(450)).toBe(60));
  it("formats", () => { expect(formatEta(25)).toBe("25 min"); expect(formatEta(135)).toBe("2 h 15 min"); });
});

describe("spintax", () => {
  it("is deterministic per seed", () => expect(spin("{a|b|c|d}", "x")).toBe(spin("{a|b|c|d}", "x")));
  it("only yields listed variants", () => { for (let i = 0; i < 50; i++) expect(["Hi", "Hello", "Namaste"]).toContain(spin("{Hi|Hello|Namaste}", `p${i}`)); });
  it("spreads across seeds", () => { const seen = new Set(Array.from({ length: 60 }, (_, i) => spin("{a|b|c}", `+91${i}`))); expect(seen.size).toBe(3); });
  it("leaves {{merge}} tags and plain braces alone", () => expect(spin("Hi {{firstName}} {x}", "s")).toBe("Hi {{firstName}} {x}"));
  it("handles several groups", () => expect(spin("{a|b} and {c|d}", "s")).toMatch(/^[ab] and [cd]$/));
  it("counts variants", () => { expect(spinVariants("{a|b} {c|d|e}")).toBe(6); expect(spinVariants("none")).toBe(1); });
});
