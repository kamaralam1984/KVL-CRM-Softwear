#!/usr/bin/env node
// Standalone trigger for the social-post publish cron (Phase 25). Sibling to
// scripts/run-leadgen.mjs — same shape, more frequent cadence since posts
// have specific scheduled times rather than a once-a-day batch.
//
// Usage:
//   SOCIAL_CRON_URL=https://yourapp.com/api/social/cron \
//   SOCIAL_CRON_SECRET=xxxx \
//   node scripts/run-social-publish.mjs

const url = process.env.SOCIAL_CRON_URL ?? "http://localhost:3008/api/social/cron";
const secret = process.env.SOCIAL_CRON_SECRET ?? process.env.CRON_SECRET;

const headers = { "Content-Type": "application/json" };
if (secret) headers.Authorization = `Bearer ${secret}`;

const started = new Date().toISOString();
console.log(`[social] ${started} → POST ${url}`);

try {
  const res = await fetch(url, { method: "POST", headers, body: "{}" });
  const body = await res.json();
  if (!res.ok || body.ok === false) {
    console.error(`[social] FAILED (${res.status}):`, body.error ?? body);
    process.exit(1);
  }
  console.log(`[social] OK — processed ${body.processed}, published ${body.published}`);
} catch (err) {
  console.error("[social] request error:", err.message);
  process.exit(1);
}
