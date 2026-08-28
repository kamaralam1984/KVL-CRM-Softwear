#!/usr/bin/env node
// Standalone trigger for the webinar reminder cron (Phase 45). Sibling to
// scripts/run-social-publish.mjs — same shape, 15-min cadence since
// reminders fire relative to each webinar's own scheduled_at.
//
// Usage:
//   WEBINAR_REMINDER_URL=https://yourapp.com/api/webinars/reminder-cron \
//   WEBINAR_REMINDER_CRON_SECRET=xxxx \
//   node scripts/run-webinar-reminders.mjs

const url = process.env.WEBINAR_REMINDER_URL ?? "http://localhost:3008/api/webinars/reminder-cron";
const secret = process.env.WEBINAR_REMINDER_CRON_SECRET ?? process.env.CRON_SECRET;

const headers = { "Content-Type": "application/json" };
if (secret) headers.Authorization = `Bearer ${secret}`;

const started = new Date().toISOString();
console.log(`[webinars] ${started} → POST ${url}`);

try {
  const res = await fetch(url, { method: "POST", headers, body: "{}" });
  const body = await res.json();
  if (!res.ok || body.ok === false) {
    console.error(`[webinars] FAILED (${res.status}):`, body.error ?? body);
    process.exit(1);
  }
  console.log(`[webinars] OK — 24h reminders sent ${body.sent24h}, 1h reminders sent ${body.sent1h}`);
} catch (err) {
  console.error("[webinars] request error:", err.message);
  process.exit(1);
}
