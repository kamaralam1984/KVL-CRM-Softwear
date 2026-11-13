# Social Media — connect accounts

## Easiest: inside the CRM
**Social Media ▸ Connect Accounts** (Advanced mode). Paste the tokens, press **Save**, then **Test <platform>**.
Tokens are AES-256 encrypted in the database (key = `SOCIAL_CONFIG_KEY`, else `WA_CONFIG_KEY`, else `AUTH_JWT_SECRET`) and
override the same variables in `.env` (empty fields fall back to `.env`). Saving is blocked if no encryption key exists.

* **Facebook & Instagram** — create a Meta app, get a Facebook *user* token in Graph API Explorer with
  `pages_show_list, pages_manage_posts, instagram_basic, instagram_content_publish`, then use **Find my Pages**: it lists your
  Pages and saves the Page ID, a non-expiring Page token and the linked Instagram account. Add App ID + App Secret (advanced)
  to see token expiry and missing permissions in the test.
* **LinkedIn** — Company Page + Community Management API (`w_organization_social`). Token lasts ~60 days. If a test says the
  API version is unsupported, set a newer `YYYYMM` under Advanced.
* **X** — app permission *Read and Write*, then generate API key/secret and Access token/secret.

## Or via .env (still supported)
```
META_PAGE_ID=  META_PAGE_ACCESS_TOKEN=  META_INSTAGRAM_USER_ID=  META_APP_ID=  META_APP_SECRET=
LINKEDIN_ACCESS_TOKEN=  LINKEDIN_ORGANIZATION_URN=  LINKEDIN_API_VERSION=
TWITTER_API_KEY=  TWITTER_API_SECRET=  TWITTER_ACCESS_TOKEN=  TWITTER_ACCESS_SECRET=
```
Restart after editing: `pm2 restart kvl-crm --update-env`.

## Scheduled posts need the scheduler
"Post Now" works immediately. "Schedule Post" rows are published by `/api/social/cron`, which must be called every few minutes.
Set `SOCIAL_CRON_SECRET` in `.env`, then on the server (`crontab -e`):
```
*/5 * * * * curl -s -X POST -H "Authorization: Bearer <SOCIAL_CRON_SECRET>" https://<your-domain>/api/social/cron
```
(or use `.github/workflows/social-scheduler.yml`, or `scripts/run-social-publish.mjs`).
