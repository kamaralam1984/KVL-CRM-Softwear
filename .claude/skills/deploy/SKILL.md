---
name: deploy
description: Verify and ship Maxness (KVL CRM) — runs the full check pipeline, commits, pushes to main, and gives the exact VPS redeploy command for maxness.kvlbusinesssolutions.com.
---

# Deploy Maxness (KVL CRM)

Invoked when the user says things like "deploy karo", "deploy kr do", "ship it", or explicitly runs `/deploy`. Production target is the user's own Hostinger VPS (`maxness.kvlbusinesssolutions.com`, PM2 process `kvl-crm`, port 3105, reverse-proxied by Nginx) — **not** Vercel; that path was considered and dropped in favor of the VPS the user already runs a dozen other sites on. The app is also still reachable at the older `crm.kvlbusinesssolutions.com` hostname — same Nginx site, same PM2 process, kept alive as an alias so old links/bookmarks/anything registered against it keep working — but `maxness.kvlbusinesssolutions.com` is now the primary/canonical domain (used in the native Capacitor app config and any new setup instructions).

## Steps

1. **Check the working tree first.** Run `git status` and `git diff --stat`. If there's nothing to deploy (clean tree, nothing ahead of `origin/main`), say so and stop — don't run a no-op pipeline.

2. **Run the verification pipeline**: `bash scripts/deploy.sh` (type-check, lint, test, build, in that order). Type-check/test/build are hard gates — if any of them fails, STOP, report the failure clearly, and do not proceed to commit/push. Lint is informational only: this repo has pre-existing baseline errors/warnings (unrelated to any single change) that were never a shipping blocker in this project's history, so the script never fails on lint output alone — read it, and if you (Claude) just introduced something clearly new and bad, fix that specifically, but don't let a report full of pre-existing noise stop a real deploy.

3. **Commit**, following this project's established convention (see the repo's own commit history for tone/style):
   - `git status` / `git diff` to see exactly what changed.
   - Write a real, specific commit message describing what changed and why — never a generic "deploy" or "update" message.
   - Never use `git add -A` blindly — stage the files that actually belong to this change.

4. **Push** to `origin main`.

5. **Give the user the VPS command to run themselves** — Claude has no SSH/remote access to the VPS in this environment, so the code-side (commit+push) is fully automated by this skill, but the VPS-side pull+rebuild is not. Two cases:
   - **First deploy** (no `/var/www/kvl-crm` on the VPS yet): give the full setup script — clone, write `.env.local`, `npm install`, `npm run build`, `pm2 start ... --name kvl-crm -- run start -- -p 3105`, `pm2 save`, write a new Nginx site file with `server_name maxness.kvlbusinesssolutions.com crm.kvlbusinesssolutions.com;` (both hostnames, one site file — never touch existing sites-available/sites-enabled files for other sites), `nginx -t` before `systemctl reload nginx` (reload, never restart), then `certbot --nginx -d maxness.kvlbusinesssolutions.com -d crm.kvlbusinesssolutions.com`.
   - **Redeploy** (app already running there): a short pull-and-restart script:
     ```bash
     cd /var/www/kvl-crm && git pull origin main && npm install && npm run build && pm2 restart kvl-crm
     ```
   - If it's unclear which case applies, ask, or give both and let the user pick.

## What this skill deliberately does NOT do

- Does not SSH into the VPS or run anything there directly — no credentials/connection exist in this environment for that. Every VPS-side step is a command handed to the user to run themselves.
- Does not touch any other Nginx site, PM2 process, or Docker container on the VPS. The VPS already hosts a dozen+ other live sites (8rupiya.in, aapkaplot.com, balratnoil.in, bodytracker.kvlbusinesssolutions.com, growthos.kvlbusinesssolutions.com, kvl-school, kvltrack.kvlbusinesssolutions.com, superai.kvlbusinesssolutions.com, restro, gravity, vidyt, and kvlbusinesssolutions.com itself) — "no other website goes down" is a hard constraint, not a nice-to-have. Any script given always uses a new, isolated app dir, PM2 name, port, and Nginx file.
- Does not touch Supabase directly (no schema migrations, no data writes). If `lib/supabase/schema.sql` changed, remind the user they still need to run it in the Supabase SQL editor themselves.
- Does not force-push, skip hooks, or bypass any check in `scripts/deploy.sh` to "make it green" — a failing check means the deploy stops, not that the check gets weakened.
