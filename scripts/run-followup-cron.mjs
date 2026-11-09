#!/usr/bin/env node
// Standalone trigger for the Follow-up Engine (every 15 min). Same shape as
// scripts/run-webinar-reminders.mjs.
//
// Usage:
//   FOLLOWUP_CRON_URL=https://yourapp.com/api/followup/cron \
//   FOLLOWUP_CRON_SECRET=xxxx node scripts/run-followup-cron.mjs

const url = process.env.FOLLOWUP_CRON_URL ?? "http://localhost:3000/api/followup/cron";
const secret = process.env.FOLLOWUP_CRON_SECRET ?? process.env.CRON_SECRET;
const headers = { "Content-Type": "application/json" };
if (secret) headers.Authorization = `Bearer ${secret}`;

console.log(`[followup] ${new Date().toISOString()} → POST ${url}`);
try {
  const res = await fetch(url, { method: "POST", headers, body: "{}" });
  const body = await res.json();
  if (!res.ok || body.ok === false) {
    console.error(`[followup] FAILED (${res.status}):`, body.error ?? body);
    process.exit(1);
  }
  console.log("[followup] OK", JSON.stringify(body));
} catch (err) {
  console.error("[followup] request error:", err.message);
  process.exit(1);
}
