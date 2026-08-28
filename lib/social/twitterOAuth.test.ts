import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { isTwitterConfigured, buildTwitterOAuthHeader } from "./twitterOAuth";

const ORIGINAL = {
  key: process.env.TWITTER_API_KEY,
  secret: process.env.TWITTER_API_SECRET,
  token: process.env.TWITTER_ACCESS_TOKEN,
  tokenSecret: process.env.TWITTER_ACCESS_SECRET,
};

function restoreEnv() {
  process.env.TWITTER_API_KEY = ORIGINAL.key;
  process.env.TWITTER_API_SECRET = ORIGINAL.secret;
  process.env.TWITTER_ACCESS_TOKEN = ORIGINAL.token;
  process.env.TWITTER_ACCESS_SECRET = ORIGINAL.tokenSecret;
}

describe("twitterOAuth", () => {
  afterAll(restoreEnv);

  it("isTwitterConfigured is false when any credential is missing", () => {
    delete process.env.TWITTER_API_KEY;
    delete process.env.TWITTER_API_SECRET;
    delete process.env.TWITTER_ACCESS_TOKEN;
    delete process.env.TWITTER_ACCESS_SECRET;
    expect(isTwitterConfigured()).toBe(false);

    process.env.TWITTER_API_KEY = "k";
    process.env.TWITTER_API_SECRET = "s";
    process.env.TWITTER_ACCESS_TOKEN = "t";
    expect(isTwitterConfigured()).toBe(false); // access secret still missing
  });

  describe("buildTwitterOAuthHeader", () => {
    beforeAll(() => {
      process.env.TWITTER_API_KEY = "consumer-key";
      process.env.TWITTER_API_SECRET = "consumer-secret";
      process.env.TWITTER_ACCESS_TOKEN = "access-token";
      process.env.TWITTER_ACCESS_SECRET = "access-secret";
    });

    it("returns null when unconfigured", () => {
      delete process.env.TWITTER_API_KEY;
      expect(buildTwitterOAuthHeader("POST", "https://api.twitter.com/2/tweets")).toBeNull();
      process.env.TWITTER_API_KEY = "consumer-key";
    });

    it("builds a well-formed OAuth 1.0a header when configured", () => {
      const header = buildTwitterOAuthHeader("POST", "https://api.twitter.com/2/tweets");
      expect(header).not.toBeNull();
      expect(header).toMatch(/^OAuth /);
      expect(header).toContain('oauth_consumer_key="consumer-key"');
      expect(header).toContain('oauth_token="access-token"');
      expect(header).toContain('oauth_signature_method="HMAC-SHA1"');
      expect(header).toMatch(/oauth_signature="[^"]+"/);
    });

    it("produces a different signature per call (fresh nonce/timestamp)", () => {
      const a = buildTwitterOAuthHeader("POST", "https://api.twitter.com/2/tweets");
      const b = buildTwitterOAuthHeader("POST", "https://api.twitter.com/2/tweets");
      expect(a).not.toEqual(b);
    });
  });
});
