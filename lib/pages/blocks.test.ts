import { describe, it, expect } from "vitest";
import { BLOCK_PALETTE, defaultBlockData, newBlockId } from "./blocks";

describe("Page builder blocks (Phase 24)", () => {
  it("every palette entry has a working default", () => {
    for (const { kind } of BLOCK_PALETTE) {
      const data = defaultBlockData(kind);
      expect(data.kind).toBe(kind);
    }
  });

  it("newBlockId returns unique ids", () => {
    const ids = new Set(Array.from({ length: 20 }, () => newBlockId()));
    expect(ids.size).toBe(20);
  });
});
