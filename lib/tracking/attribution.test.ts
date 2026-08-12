import { describe, it, expect } from "vitest";
import { parseAttribution } from "./attribution";

describe("parseAttribution", () => {
  it("extracts explicit UTM params", () => {
    const a = parseAttribution(
      "https://kvl.example/pricing?utm_source=google&utm_medium=cpc&utm_campaign=diwali_sale&utm_term=crm&utm_content=hero",
      "",
      "kvl.example"
    );
    expect(a).toMatchObject({
      source: "google",
      medium: "cpc",
      campaign: "diwali_sale",
      term: "crm",
      content: "hero",
    });
  });

  it("infers google/cpc from gclid when no utm_source is present", () => {
    const a = parseAttribution("https://kvl.example/pricing?gclid=abc123", "", "kvl.example");
    expect(a.source).toBe("google");
    expect(a.medium).toBe("cpc");
    expect(a.gclid).toBe("abc123");
  });

  it("infers facebook/paid_social from fbclid when no utm_source is present", () => {
    const a = parseAttribution("https://kvl.example/pricing?fbclid=xyz789", "", "kvl.example");
    expect(a.source).toBe("facebook");
    expect(a.medium).toBe("paid_social");
    expect(a.fbclid).toBe("xyz789");
  });

  it("does not override an explicit utm_source even when a click id is present", () => {
    // A campaign builder set utm_source explicitly — respect it rather than
    // guessing from fbclid, even though fbclid is also present.
    const a = parseAttribution(
      "https://kvl.example/pricing?utm_source=facebook&fbclid=xyz789",
      "",
      "kvl.example"
    );
    expect(a.source).toBe("facebook");
    expect(a.medium).toBe("none");
  });

  it("classifies a search-engine referrer as organic when no UTM/click-id is present", () => {
    const a = parseAttribution("https://kvl.example/pricing", "https://www.google.com/search?q=crm", "kvl.example");
    expect(a.source).toContain("google.com");
    expect(a.medium).toBe("organic");
  });

  it("classifies a social-network referrer as organic_social", () => {
    const a = parseAttribution("https://kvl.example/pricing", "https://www.instagram.com/", "kvl.example");
    expect(a.source).toContain("instagram.com");
    expect(a.medium).toBe("organic_social");
  });

  it("classifies an unrecognized external referrer as referral", () => {
    const a = parseAttribution("https://kvl.example/pricing", "https://news.example.com/article", "kvl.example");
    expect(a.source).toBe("news.example.com");
    expect(a.medium).toBe("referral");
  });

  it("classifies no referrer as direct", () => {
    const a = parseAttribution("https://kvl.example/pricing", "", "kvl.example");
    expect(a.source).toBe("direct");
    expect(a.medium).toBe("none");
  });

  it("treats a same-host referrer (internal navigation) as direct", () => {
    const a = parseAttribution("https://kvl.example/pricing", "https://kvl.example/", "kvl.example");
    expect(a.source).toBe("direct");
  });
});
