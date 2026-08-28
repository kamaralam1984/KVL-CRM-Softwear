// Phase 35 — Real Twitter/X publishing. Twitter API v2's POST /2/tweets
// needs a signed request identifying the connected account; hand-rolled
// OAuth 1.0a (HMAC-SHA1) with Node's built-in crypto, same zero-dependency
// convention as lib/messaging/twilioSignature.ts (no twitter-api-v2/twit
// package). Chosen over OAuth 2.0 user-context because that needs a
// 3-legged PKCE flow + refresh-token storage; OAuth 1.0a's long-lived
// consumer+access token pair matches this app's single-connected-account
// use case with no extra moving parts.
//
// Only ever signs POST /2/tweets with a JSON body — OAuth 1.0a's signature
// base string only includes oauth_* params plus any query-string/form-
// encoded params, never a JSON body, so this intentionally has no "extra
// params" argument.

import { createHmac, randomBytes } from "crypto";

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!*'()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

export function isTwitterConfigured(): boolean {
  return Boolean(
    process.env.TWITTER_API_KEY &&
      process.env.TWITTER_API_SECRET &&
      process.env.TWITTER_ACCESS_TOKEN &&
      process.env.TWITTER_ACCESS_SECRET,
  );
}

export function buildTwitterOAuthHeader(method: string, url: string): string | null {
  const consumerKey = process.env.TWITTER_API_KEY;
  const consumerSecret = process.env.TWITTER_API_SECRET;
  const token = process.env.TWITTER_ACCESS_TOKEN;
  const tokenSecret = process.env.TWITTER_ACCESS_SECRET;
  if (!consumerKey || !consumerSecret || !token || !tokenSecret) return null;

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: token,
    oauth_version: "1.0",
  };

  const paramString = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join("&");

  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  const signature = createHmac("sha1", signingKey).update(baseString).digest("base64");

  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  return (
    "OAuth " +
    Object.keys(headerParams)
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(headerParams[k])}"`)
      .join(", ")
  );
}
