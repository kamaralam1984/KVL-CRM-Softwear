# WhatsApp — send from your own number

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
Built-in protection: 4–9 s random gap between sends, `WHATSAPP_QR_DAILY_CAP` (default 200), skips numbers not on WhatsApp.
Session lives in `whatsapp-qr/auth/` — back it up; delete it to re-link.
