# Communications — setup checklist

Everything below is built; it needs configuration to go live. Without keys each channel logs a
"mock" send (visible as `mock` in the inbox / reports) — nothing is silently faked as delivered.

## 1. Database
Run `lib/db/schema.sql` in the Neon SQL Editor (idempotent), and set `DATABASE_URL`, `AUTH_JWT_SECRET`, `NEXT_PUBLIC_AUTH_ENABLED=true`.

## 2. Cron
GitHub secrets `FOLLOWUP_CRON_URL` (`https://<app>/api/followup/cron`) + `FOLLOWUP_CRON_SECRET`
(same value as `FOLLOWUP_CRON_SECRET`/`CRON_SECRET` in the app env). Runs every 5 min: drip steps,
24h AI nudges, all reminders.

## 3. Env vars
| Purpose | Variables |
|---|---|
| App URL (links, webhooks, unsubscribe) | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BRAND_NAME` |
| WhatsApp / SMS | see `docs/WHATSAPP_OWN_NUMBER.md` (+ Twilio `TWILIO_*`) |
| Email | `RESEND_API_KEY`, `OUTREACH_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`, `EMAIL_INBOUND_SECRET` (optional generic inbound) |
| Unsubscribe link signing | `UNSUBSCRIBE_SECRET` (falls back to `CRON_SECRET`) |
| AI nudge / auto-answer | `ANTHROPIC_API_KEY` |
| Click-to-call | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`; optional `CALL_RECORDING=true` |
| AI calls (opt-in) | `FOLLOWUP_AI_CALLS=true` (+ voice relay, see Phase 44) |
| Voicemail drops | `FOLLOWUP_RVM_AUDIO_URL`, `RVM_GATEWAY_URL`, `RVM_USERNAME`, `RVM_PASSWORD` |
| Team alerts (instant) | Comms Hub → Settings, or `TEAM_ALERT_WHATSAPP`, `TEAM_ALERT_EMAIL` |

## 4. Webhooks
| Provider | URL | Notes |
|---|---|---|
| Twilio messaging status | automatic (`StatusCallback` is set on every send) | needs `NEXT_PUBLIC_APP_URL` |
| Twilio WhatsApp/SMS inbound | `/api/whatsapp/inbound`, `/api/sms/inbound` | |
| Meta Cloud API | `/api/whatsapp/cloud` | subscribe to **messages** (also delivers delivered/read/failed) |
| Resend | `/api/email/webhook` | enable events: delivered, bounced, complained, opened, clicked, **received** |
| Any other inbound-email provider | `POST /api/email/inbound` + `Authorization: Bearer $EMAIL_INBOUND_SECRET` | JSON `{from,to,subject,text}` |

⚠ Resend's inbound (`email.received`) API shape should be re-verified against their current docs —
the body fetch (`GET /emails/receiving/:id`) is best-effort; the generic `/api/email/inbound` endpoint is the safe fallback.

## 5. Email deliverability (do this before sending at volume)
1. **SPF** — TXT on your sending domain: `v=spf1 include:amazonses.com ~all` (use the exact value Resend shows).
2. **DKIM** — add the CNAME/TXT records Resend generates (Resend → Domains).
3. **DMARC** — TXT `_dmarc`: `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com` → move to `quarantine` after 2–4 weeks of clean reports.
4. Send from a subdomain (`mail.yourdomain.com`), warm up gradually (≈50/day → double weekly).
5. Resend → Domains → enable **open & click tracking** (needed for the open/click numbers in Reports).
6. Unsubscribe link + `List-Unsubscribe` headers are added automatically to non-transactional mail; hard bounces
   and spam complaints are auto-added to the Do-Not-Contact list.

## 6. India compliance notes
- SMS needs DLT registration (Settings → DLT Templates stores the entity/template IDs).
- Keep `STOP` handling on: any STOP / "not interested" / "mat bhejo" reply is added to the central DNC list.
- Calls: set `CALL_RECORDING=true` only with the consent notice enabled (it plays automatically to the called party).
