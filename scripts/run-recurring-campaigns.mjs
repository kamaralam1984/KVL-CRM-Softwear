#!/usr/bin/env node
// Standalone daily trigger for birthday/seasonal campaigns (Phase 33).
// Sibling to scripts/run-leadgen.mjs — same shape.
//
// Usage:
//   OUTREACH_RECURRING_URL=https://yourapp.com/api/outreach/recurring-cron \
//   OUTREACH_RECURRING_CRON_SECRET=xxxx \
//   node scripts/run-recurring-campaigns.mjs

const url = process.env.OUTREACH_RECURRING_URL ?? "http://localhost:3008/api/outreach/recurring-cron";
const secret = process.env.OUTREACH_RECURRING_CRON_SECRET ?? process.env.CRON_SECRET;

const headers = { "Content-Type": "application/json" };
if (secret) headers.Authorization = `Bearer ${secret}`;

const started = new Date().toISOString();
console.log(`[outreach] ${started} → POST ${url}`);

try {
  const res = await fetch(url, { method: "POST", headers, body: "{}" });
  const body = await res.json();
  if (!res.ok || body.ok === false) {
    console.error(`[outreach] FAILED (${res.status}):`, body.error ?? body);
    process.exit(1);
  }
  console.log(`[outreach] OK — birthdays sent ${body.birthdaysSent}, seasonal campaigns due ${body.campaignsFired}`);
} catch (err) {
  console.error("[outreach] request error:", err.message);
  process.exit(1);
}
