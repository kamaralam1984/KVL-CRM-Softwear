---
name: deploy
description: Verify and ship KVL CRM to production — runs the full check pipeline, then commits and pushes to main so Vercel's GitHub integration deploys it automatically.
---

# Deploy KVL CRM

Invoked when the user says things like "deploy karo", "deploy kr do", "ship it", or explicitly runs `/deploy`. The goal: get the current working tree live in production with no further steps from the user, other than the one-time Vercel connection described below (which only they can do — it requires their Vercel account).

## Steps

1. **Check the working tree first.** Run `git status` and `git diff --stat`. If there's nothing to deploy (clean tree, nothing ahead of `origin/main`), say so and stop — don't run a no-op pipeline.

2. **Run the verification pipeline**: `bash scripts/deploy.sh` (type-check, lint, test, build, in that order). Type-check/test/build are hard gates — if any of them fails, STOP, report the failure clearly, and do not proceed to commit/push. Lint is informational only: this repo has pre-existing baseline errors/warnings (unrelated to any single change) that were never a shipping blocker in this project's history, so the script never fails on lint output alone — read it, and if you (Claude) just introduced something clearly new and bad, fix that specifically, but don't let a report full of pre-existing noise stop a real deploy.

3. **Commit**, following this project's established convention (see the repo's own commit history for tone/style):
   - `git status` / `git diff` to see exactly what changed.
   - Write a real, specific commit message describing what changed and why — never a generic "deploy" or "update" message.
   - Never use `git add -A` blindly — stage the files that actually belong to this change.

4. **Push** to `origin main`.

5. **Tell the user what happens next**, based on whether Vercel is already connected:
   - If they've confirmed Vercel's GitHub integration is connected to this repo: the push you just made already triggered a production deployment — nothing else to do. Mention they can watch it at their Vercel dashboard.
   - If it's not connected yet (or you don't know): explain this is a **one-time manual step only they can do** — go to vercel.com → Add New Project → Import `kamaralam1984/KVL-CRM-Softwear` from GitHub → add the environment variables from `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and any Wave 9/10 optional vars — VAPID keys, `MISSED_CALL_WEBHOOK_SECRET`, Truecaller keys — if those features are wanted live) in Vercel's Project Settings → Environment Variables. After that one-time setup, every future push to `main` — including the ones this skill makes — deploys automatically with zero further action from either of you.

## What this skill deliberately does NOT do

- Does not call the Vercel CLI or hit Vercel's API — no Vercel token exists in this environment, and there's no safe way to authenticate non-interactively. Deployment is triggered entirely by the `git push`, via Vercel's own GitHub integration.
- Does not touch Supabase directly (no schema migrations, no data writes). If `lib/supabase/schema.sql` changed, remind the user they still need to run it in the Supabase SQL editor themselves — this skill doesn't have Supabase credentials to do that on their behalf, and running arbitrary SQL against their live database isn't something to do without them present.
- Does not force-push, skip hooks, or bypass any check in `scripts/deploy.sh` to "make it green" — a failing check means the deploy stops, not that the check gets weakened.
