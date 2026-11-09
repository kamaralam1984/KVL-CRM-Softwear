# Database & auth — Neon Postgres

The CRM stores everything in a plain PostgreSQL database (Neon recommended) and runs its own login system.
There is no third-party backend SDK: server code talks to Postgres through `lib/db` (a small query layer over `pg`),
and accounts/sessions live in `lib/auth`.

## 1. Create the database
1. neon.tech → new project → copy the **pooled** connection string (host contains `-pooler`).
2. Neon SQL Editor → paste and run `lib/db/schema.sql`
   (or `psql "$DATABASE_URL" -f lib/db/schema.sql`). It is idempotent — safe to re-run after updates.

## 2. Environment
```
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
AUTH_JWT_SECRET=<openssl rand -base64 32>      # signs login sessions (keep secret; changing it logs everyone out)
NEXT_PUBLIC_AUTH_ENABLED=true                  # real accounts (build-time flag); unset = demo mode with seed data
NEXT_PUBLIC_APP_URL=https://your-domain        # used in reset-password emails, unsubscribe links, webhooks
```
Optional: `DATABASE_POOL_MAX` (default 10), `AUTH_ALLOW_ADMIN_SIGNUP=true` (let the self-serve plan signup create Admin
accounts — off by default; the first account ever created is always Admin).

Rebuild after changing any `NEXT_PUBLIC_*` value (`npm run build`).

## 3. Auth
| Endpoint | Purpose |
|---|---|
| `POST /api/auth/signup` · `/login` | email + password (scrypt hashed, 7-day signed session token) |
| `POST /api/auth/forgot` · `/reset` | emailed single-use link, valid 1 hour (needs `RESEND_API_KEY` + `OUTREACH_FROM_EMAIL`) |
| `GET /api/auth/me` | validate/refresh a session |
| `GET /api/auth/oauth/google` · `/github` | optional — set `GOOGLE_CLIENT_ID/_SECRET` and/or `GITHUB_CLIENT_ID/_SECRET`; register redirect URI `<app>/api/auth/oauth/<provider>/callback` |

Login/signup are rate-limited per IP. Password-reset requests never reveal whether an email has an account.

## 4. Moving existing data from another Postgres
Data tables copy as-is (same names/columns): `pg_dump --data-only --inserts -t 'public.*' <old> | psql "$DATABASE_URL"`
(run the schema on Neon first). Users: export `id, email, encrypted_password, raw_user_meta_data, email_confirmed_at, created_at`
from the old `auth.users` and insert into `auth_users (id, email, password_hash, user_metadata, email_confirmed_at, created_at)`;
bcrypt hashes (`$2…`) are accepted and silently upgraded to scrypt on each user's next login. Keep the same user ids so
`profiles.id` still matches.

## 5. Notes
- Access control is enforced in the app (server actions + RBAC). The database is only reachable with `DATABASE_URL`,
  so no row-level-security policies are used — **never expose `DATABASE_URL` to the browser**.
- Without `DATABASE_URL` every query returns an error result and the UI falls back to demo/seed data (nothing crashes).
- Tests against a real database: `TEST_DATABASE_URL=postgresql://… npx vitest run` (query layer, auth, and the whole
  follow-up/reminder/DNC stack; skipped when the variable is unset).
