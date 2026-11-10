import { describe, it, expect } from "vitest";
import { matchRule, renderRule, splitKeywords, type AutoRule } from "./rules";

const r = (o: Partial<AutoRule>): AutoRule => ({ id: "1", name: "r", keywords: "price", match: "contains", response: "Hi", when_open: "always", priority: 100, active: true, hits: 0, ...o });

describe("matchRule", () => {
  it("matches whole words, not substrings", () => {
    expect(matchRule("what is the price?", [r({})], true)).not.toBeNull();
    expect(matchRule("priceless gem", [r({})], true)).toBeNull();
  });
  it("supports several keywords and Hinglish phrases", () => {
    const rule = r({ keywords: "rate, kitne ka hai\ncost" });
    expect(matchRule("Bhai ye kitne ka hai", [rule], true)).not.toBeNull();
    expect(matchRule("COST please", [rule], true)).not.toBeNull();
  });
  it("exact and starts modes", () => {
    expect(matchRule("hi", [r({ keywords: "hi", match: "exact" })], true)).not.toBeNull();
    expect(matchRule("hi there", [r({ keywords: "hi", match: "exact" })], true)).toBeNull();
    expect(matchRule("demo please", [r({ keywords: "demo", match: "starts" })], true)).not.toBeNull();
  });
  it("respects priority, active flag and business hours", () => {
    const a = r({ id: "a", priority: 5, response: "A" }), b = r({ id: "b", priority: 1, response: "B" });
    expect(matchRule("price", [a, b], true)?.id).toBe("b");
    expect(matchRule("price", [r({ active: false })], true)).toBeNull();
    expect(matchRule("price", [r({ when_open: "off_hours" })], true)).toBeNull();
    expect(matchRule("price", [r({ when_open: "off_hours" })], false)).not.toBeNull();
    expect(matchRule("price", [r({ when_open: "in_hours" })], false)).toBeNull();
  });
  it("ignores empty message / empty response", () => {
    expect(matchRule("  ", [r({})], true)).toBeNull();
    expect(matchRule("price", [r({ response: " " })], true)).toBeNull();
  });
});

describe("renderRule / splitKeywords", () => {
  it("fills placeholders", () => expect(renderRule("Hi {{firstName}}, book: {{bookingLink}}", { name: "Asha Sharma", bookingLink: "https://x.io" })).toBe("Hi Asha, book: https://x.io"));
  it("splits keywords on comma/newline/pipe", () => expect(splitKeywords("A, b\nC|d")).toEqual(["a", "b", "c", "d"]));
});
