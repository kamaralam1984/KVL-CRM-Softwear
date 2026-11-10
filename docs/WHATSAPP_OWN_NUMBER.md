# WhatsApp — send from your own number

## Easiest: set it up inside the CRM
**Comms Hub → WhatsApp Setup** (also **WhatsApp CRM → Setup**): choose Cloud API / QR / Twilio, paste the details, *Save*,
then *Test connection* (shows number, quality rating, or the QR to scan) and *Send test*. Values saved there override `.env`
(empty fields fall back to `.env`); tokens are AES-encrypted in the database (`WA_CONFIG_KEY`, else `AUTH_JWT_SECRET`).
Cloud API: add the WABA ID and use *Sync templates from Meta*. Run `lib/db/schema.sql` once (adds `wa_broadcasts*` tables).

## Bulk sending — Broadcast
**Comms Hub → Broadcast** (or **WhatsApp CRM → Broadcast**): text, image/PDF or approved template; audience from CRM leads
(status/stage/tag/owner/score filters, hand-picked) and/or pasted numbers; merge tags `{{name}} {{firstName}} {{company}}`;
auto-removes duplicates, bad numbers and opted-out (DNC) contacts; optional IST send window, schedule, "Reply STOP" footer,
test-to-self, live per-recipient report (sent/delivered/read/replied/failed), pause/resume/cancel/retry-failed.
It runs while the tab is open and via the existing follow-up cron (every 5 min) when it isn't. The daily cap (Setup → Limits)
and provider pacing apply; on a rate limit or disconnect it pauses itself and resumes automatically.

## Inbox, media, auto-reply
- **Chats** (WhatsApp CRM) = the unified inbox: live (polls every few seconds), customer images / voice notes / videos / PDFs shown inline
  (stored in `wa_media`, served via signed `/api/whatsapp/media/<id>?sig=…`, 6 MB cap), delivery ticks (✓ sent, ✓✓ delivered, blue read — also in QR mode),
  quick replies and templates merge `{{name}}` / `{{firstName}}`; templates with `{{1}}` ask for the values before sending.
- **Auto Reply** = keyword rules stored in `wa_auto_rules` (contains / starts / exact, business-hours condition, priority, `{{name}} {{bookingLink}} {{paymentLink}}`),
  with a tester. Order on every inbound message: keyword rule → AI answer (knowledge base) → off-hours message. STOP is never auto-replied.
- **Templates → "Create a WhatsApp template on Meta"** submits for approval; "Check approval status" syncs the result.
- Webhooks answer instantly and process in the background; retried messages are ignored (idempotent); the sidebar badge shows the real unread count.
- Apply the schema with `DATABASE_URL=… node scripts/apply-schema.mjs` (idempotent; verifies the objects) — or paste `lib/db/schema.sql` into the Neon SQL Editor (adds `wa_media`, `wa_auto_rules`, `conversations.last_rule_reply_at`, unique index on inbound message ids).
- QR mode: redeploy the `whatsapp-qr` service (it now forwards media and delivery/read receipts).

*The `.env` way (still supported):*

Switch with `WHATSAPP_PROVIDER=cloud | qr | twilio` in `.env.local`
(if unset it auto-detects from whichever variables below exist). Follow-up Engine,
Conversations inbox, Workflow Builder and webinar reminders all use it automatically.

## Mode 1 — Meta Cloud API (official, recommended)
1. developers.facebook.com → create app → add **WhatsApp** → add/verify your number.
2. Env:
   ```
   WHATSAPP_PROVIDER=cloud
   WHATSAPP_CLOUD_TOKEN=<permanent system-user token>
   WHATSAPP_CLOUD_PHONE_NUMBER_ID=<phone number id>
   WHATSAPP_CLOUD_VERIFY_TOKEN=<any random string you choose>
   META_APP_SECRET=<app secret>            # verifies inbound webhook signatures
   WHATSAPP_CLOUD_TEMPLATE_NAME=<template> # optional, see below
   WHATSAPP_CLOUD_TEMPLATE_LANG=en
   ```
3. Meta → WhatsApp → Configuration → Webhook: callback `https://<your-app>/api/whatsapp/cloud`,
   verify token = `WHATSAPP_CLOUD_VERIFY_TOKEN`, subscribe to **messages**.
4. **24-hour rule:** free-text only works within 24h of the client's last message. For cold
   follow-ups create an approved *Utility/Marketing* template whose body is just `{{1}}`
   (e.g. body: `{{1}}`) and set `WHATSAPP_CLOUD_TEMPLATE_NAME`; the CRM falls back to it automatically.

## Mode 2 — QR scan (linked device, unofficial)
⚠ Against WhatsApp's ToS for bulk/automated messaging — numbers can be banned. Use a number you can
afford to lose. Needs an always-on server (VPS/PM2/Docker), not Vercel.
```
cd whatsapp-qr && npm install
WHATSAPP_QR_SECRET=<16+ random chars> CRM_URL=https://<your-app> WHATSAPP_QR_PORT=4002 node server.mjs
```
Open `http://<server>:4002/?key=<secret>`, scan the QR (WhatsApp ▸ Linked devices). Then in the CRM env:
```
WHATSAPP_PROVIDER=qr
WHATSAPP_QR_URL=http://<server>:4002     # put it behind HTTPS (Nginx) in production
WHATSAPP_QR_SECRET=<same secret>
```
**Updating / running it under PM2 on the VPS** (keeps the linked session — no re-scan needed, `auth/` is untouched):
```
cd <repo>/whatsapp-qr && git pull origin main && npm install
# first time:
WHATSAPP_QR_SECRET=<same secret as CRM> CRM_URL=https://<your-app> WHATSAPP_QR_PORT=4002 \
  pm2 start server.mjs --name kvl-wa-qr && pm2 save
# already running:
pm2 restart kvl-wa-qr --update-env
pm2 logs kvl-wa-qr --lines 20     # expect: "WhatsApp QR service on :4002" then "WhatsApp connected"
```
Then CRM ▸ WhatsApp Setup ▸ *Test connection* → state must be `connected`.

Built-in protection: 4–9 s random gap between sends, `WHATSAPP_QR_DAILY_CAP` (default 200), skips numbers not on WhatsApp.
Session lives in `whatsapp-qr/auth/` — back it up; delete it to re-link.
