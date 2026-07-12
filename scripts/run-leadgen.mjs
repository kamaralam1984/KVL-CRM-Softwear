#!/usr/bin/env node
// Standalone daily trigger for the lead-gen pipeline.
// For self-hosting (system crontab, GitHub Actions, any server) — not needed
// on Vercel, where vercel.json handles the schedule.
//
// Usage:
//   LEADGEN_URL=https://yourapp.com/api/leadgen/run \
//   LEADGEN_CRON_SECRET=xxxx \
//   node scripts/run-leadgen.mjs
//
// Defaults to http://localhost:3008 for local testing.

const url = process.env.LEADGEN_URL ?? "http://localhost:3008/api/leadgen/run";
const secret = process.env.LEADGEN_CRON_SECRET ?? process.env.CRON_SECRET;

const headers = { "Content-Type": "application/json" };
if (secret) headers.Authorization = `Bearer ${secret}`;

const started = new Date().toISOString();
console.log(`[leadgen] ${started} → POST ${url}`);

try {
  const res = await fetch(url, { method: "POST", headers, body: "{}" });
  const body = await res.json();
  if (!res.ok || body.ok === false) {
    console.error(`[leadgen] FAILED (${res.status}):`, body.error ?? body);
    process.exit(1);
  }
  console.log(
    `[leadgen] OK — sourced ${body.sourced}, dedupe ${body.afterDedupe}, saved ${body.saved}` +
      (body.usedMockData ? " (MOCK data — set GOOGLE_MAPS_API_KEY)" : ""),
  );
} catch (err) {
  console.error("[leadgen] request error:", err.message);
  process.exit(1);
}
