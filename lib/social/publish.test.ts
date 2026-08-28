import { describe, it, expect } from "vitest";
import { publishSocialPost } from "./publish";

describe("publishSocialPost (Phase 25) — mock fallback, never throws", () => {
  it("mocks facebook when META_PAGE_ID/META_PAGE_ACCESS_TOKEN aren't set", async () => {
    const result = await publishSocialPost("facebook", "Hello world");
    expect(result.ok).toBe(true);
    expect(result.mock).toBe(true);
  });

  it("mocks instagram (also requires an image, which this call doesn't pass)", async () => {
    const result = await publishSocialPost("instagram", "Hello world");
    expect(result.mock).toBe(true);
  });

  it("mocks linkedin when LINKEDIN_ORGANIZATION_URN isn't set", async () => {
    const result = await publishSocialPost("linkedin", "Hello world");
    expect(result.mock).toBe(true);
  });

  it("honestly mocks a platform with no real publisher wired yet", async () => {
    const result = await publishSocialPost("twitter", "Hello world");
    expect(result.ok).toBe(true);
    expect(result.mock).toBe(true);
  });
});
