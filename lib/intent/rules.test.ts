import { describe, it, expect } from "vitest";
import { bandFromScore, DEFAULT_RULES } from "./rules";

describe("bandFromScore", () => {
  it("uses the default 31/61/81 thresholds", () => {
    expect(bandFromScore(0, DEFAULT_RULES)).toBe("cold");
    expect(bandFromScore(30, DEFAULT_RULES)).toBe("cold");
    expect(bandFromScore(31, DEFAULT_RULES)).toBe("warm");
    expect(bandFromScore(60, DEFAULT_RULES)).toBe("warm");
    expect(bandFromScore(61, DEFAULT_RULES)).toBe("hot");
    expect(bandFromScore(80, DEFAULT_RULES)).toBe("hot");
    expect(bandFromScore(81, DEFAULT_RULES)).toBe("very_hot");
    expect(bandFromScore(100, DEFAULT_RULES)).toBe("very_hot");
  });

  it("respects custom thresholds when provided", () => {
    const rules = { "threshold:warm": 20, "threshold:hot": 50, "threshold:very_hot": 90 };
    expect(bandFromScore(20, rules)).toBe("warm");
    expect(bandFromScore(49, rules)).toBe("warm");
    expect(bandFromScore(50, rules)).toBe("hot");
    expect(bandFromScore(89, rules)).toBe("hot");
    expect(bandFromScore(90, rules)).toBe("very_hot");
  });

  it("falls back to defaults for missing threshold keys", () => {
    expect(bandFromScore(85, {})).toBe("very_hot");
  });
});
