import { describe, it, expect } from "vitest";
import { isWithinBusinessHours, nextOpeningLabel, DEFAULT_HOURS } from "./hours";

const cfg = { ...DEFAULT_HOURS, enabled: true }; // Mon–Sat 10:00–19:00 IST
// 2026-01-12 is a Monday. 06:30 UTC = 12:00 IST.
const at = (d: number, h: number, m = 0) => new Date(Date.UTC(2026, 0, d, h, m));

describe("business hours (IST)", () => {
  it("always open when disabled", () => expect(isWithinBusinessHours(at(11, 21), DEFAULT_HOURS)).toBe(true));
  it("open at noon on a Monday", () => expect(isWithinBusinessHours(at(12, 6, 30), cfg)).toBe(true));
  it("closed at 9 PM IST", () => expect(isWithinBusinessHours(at(12, 15, 30), cfg)).toBe(false));
  it("closed before opening (09:30 IST)", () => expect(isWithinBusinessHours(at(12, 4, 0), cfg)).toBe(false));
  it("closed on Sunday", () => expect(isWithinBusinessHours(at(11, 6, 30), cfg)).toBe(false));
  it("next opening is tomorrow when closed in the evening", () => expect(nextOpeningLabel(at(12, 15, 30), cfg)).toBe("Tue 10:00"));
  it("next opening is today when before opening", () => expect(nextOpeningLabel(at(12, 4, 0), cfg)).toBe("today 10:00"));
  it("skips Sunday", () => expect(nextOpeningLabel(at(10, 15, 30), cfg)).toBe("Mon 10:00")); // Saturday night → Monday
});
