import { describe, it, expect } from "vitest";
import { templateReviewReply, draftReviewReply } from "./aiReply";

describe("Reputation reply drafting (Phase 26)", () => {
  it("templateReviewReply thanks a 5-star reviewer warmly", () => {
    const reply = templateReviewReply({ authorName: "Priya", rating: 5 });
    expect(reply).toContain("Priya");
    expect(reply.toLowerCase()).toContain("thank");
  });

  it("templateReviewReply apologizes for a low-star review", () => {
    const reply = templateReviewReply({ authorName: "Rohit", rating: 2 });
    expect(reply.toLowerCase()).toMatch(/sorry|reach out/);
  });

  it("templateReviewReply falls back to a generic name", () => {
    const reply = templateReviewReply({ authorName: "", rating: 5 });
    expect(reply).toContain("there");
  });

  it("draftReviewReply returns null when ANTHROPIC_API_KEY isn't set", async () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const result = await draftReviewReply({ authorName: "Test", rating: 5, reviewText: "Great!" });
    expect(result).toBeNull();
    if (original) process.env.ANTHROPIC_API_KEY = original;
  });
});
