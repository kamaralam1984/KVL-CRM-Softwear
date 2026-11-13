import { describe, it, expect, beforeAll } from "vitest";
import { maskSocialConfig, normalizeSocialConfig, EMPTY_SOCIAL_CONFIG, type SocialConfig } from "./config";
import { encryptSecret, decryptSecret } from "@/lib/security/secretBox";
import { platformConnection } from "./connections";

const clone = (c: SocialConfig) => JSON.parse(JSON.stringify(c)) as SocialConfig;

describe("maskSocialConfig", () => {
  it("masks every credential (keeping the last 4), leaves ids alone, never mutates the input", () => {
    const c = clone(EMPTY_SOCIAL_CONFIG);
    c.meta.pageId = "1045"; c.meta.pageToken = "EAAGpagetoken9876"; c.meta.appSecret = "appsecretABCD";
    c.linkedin.token = "lin-token-5555"; c.twitter.accessSecret = "xsecret-0001";
    const m = maskSocialConfig(c);
    expect(m.meta.pageToken).toBe("••••9876");
    expect(m.meta.appSecret).toBe("••••ABCD");
    expect(m.linkedin.token).toBe("••••5555");
    expect(m.twitter.accessSecret).toBe("••••0001");
    expect(m.meta.pageId).toBe("1045");
    expect(c.meta.pageToken).toBe("EAAGpagetoken9876");
  });
  it("shows empty secrets as empty", () => expect(maskSocialConfig(EMPTY_SOCIAL_CONFIG).twitter.apiKey).toBe(""));
});

describe("normalizeSocialConfig", () => {
  it("turns a bare LinkedIn page number into a URN and keeps a full URN", () => {
    const c = clone(EMPTY_SOCIAL_CONFIG);
    c.linkedin.orgUrn = " 12345678 ";
    expect(normalizeSocialConfig(c).linkedin.orgUrn).toBe("urn:li:organization:12345678");
    c.linkedin.orgUrn = "urn:li:organization:99";
    expect(normalizeSocialConfig(c).linkedin.orgUrn).toBe("urn:li:organization:99");
  });
  it("accepts only YYYYMM API versions and strips non-digits from Meta ids", () => {
    const c = clone(EMPTY_SOCIAL_CONFIG);
    c.linkedin.apiVersion = "2025-10"; c.meta.pageId = "pg 104-5"; c.meta.igUserId = "17841 4";
    const n = normalizeSocialConfig(c);
    expect(n.linkedin.apiVersion).toBe("");
    expect(n.meta.pageId).toBe("1045");
    expect(n.meta.igUserId).toBe("178414");
    c.linkedin.apiVersion = "202510";
    expect(normalizeSocialConfig(c).linkedin.apiVersion).toBe("202510");
  });
});

describe("secretBox", () => {
  beforeAll(() => { process.env.AUTH_JWT_SECRET = "test-secret-for-social-config"; });
  it("round-trips, never stores plaintext, and passes legacy plaintext through", () => {
    const e = encryptSecret("my-token-123");
    expect(e.startsWith("enc:v1:")).toBe(true);
    expect(e).not.toContain("my-token-123");
    expect(decryptSecret(e)).toBe("my-token-123");
    expect(decryptSecret("plain-old-value")).toBe("plain-old-value");
  });
  it("two encryptions of the same value differ (random IV)", () => expect(encryptSecret("same")).not.toBe(encryptSecret("same")));
  it("a tampered ciphertext decrypts to empty rather than throwing", () => {
    const e = encryptSecret("my-token-123");
    expect(decryptSecret(e.slice(0, -4) + "AAAA")).toBe("");
  });
});

describe("platformConnection with an injected env", () => {
  it("reads the passed env (CRM-saved credentials overlaid) instead of process.env", () => {
    expect(platformConnection("facebook", { META_PAGE_ID: "1", META_PAGE_ACCESS_TOKEN: "t" }).connected).toBe(true);
    expect(platformConnection("instagram", { META_PAGE_ACCESS_TOKEN: "t" }).missing).toEqual(["META_INSTAGRAM_USER_ID"]);
    expect(platformConnection("twitter", {}).missing).toHaveLength(4);
  });
});
