import { describe, it, expect } from "vitest";
import { validatePost } from "./validate";

const ok = { platform: "linkedin" as const, postType: "text", content: "Hello team" };

describe("validatePost", () => {
  it("accepts a plain text post", () => expect(validatePost(ok)).toBeNull());
  it("rejects empty content", () => expect(validatePost({ ...ok, content: "   " })).toMatch(/Write something/));
  it("enforces each platform's character limit (X = 280)", () => {
    expect(validatePost({ ...ok, platform: "twitter", content: "x".repeat(281) })).toMatch(/280/);
    expect(validatePost({ ...ok, platform: "twitter", content: "x".repeat(280) })).toBeNull();
  });
  it("rejects video / story / reel (no publisher for them)", () => {
    for (const t of ["video", "story", "reel"]) expect(validatePost({ ...ok, postType: t })).toMatch(/isn't supported/);
  });
  it("Instagram needs a public https image", () => {
    const ig = { platform: "instagram" as const, postType: "text", content: "Hi" };
    expect(validatePost(ig)).toMatch(/needs an image/);
    expect(validatePost({ ...ig, postType: "image" })).toMatch(/needs an image/);
    expect(validatePost({ ...ig, postType: "image", mediaUrl: "http://x.com/a.jpg" })).toMatch(/https/);
    expect(validatePost({ ...ig, postType: "image", mediaUrl: "https://x.com/a.jpg" })).toBeNull();
  });
  it("images are only for Instagram and Facebook", () => {
    expect(validatePost({ ...ok, postType: "image", mediaUrl: "https://x.com/a.jpg" })).toMatch(/Instagram and Facebook/);
    expect(validatePost({ platform: "facebook", postType: "image", content: "Hi", mediaUrl: "https://x.com/a.jpg" })).toBeNull();
  });
});
