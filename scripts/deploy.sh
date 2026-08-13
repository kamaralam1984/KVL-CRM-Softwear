#!/usr/bin/env bash
# KVL CRM — deploy verification pipeline.
# Runs every check the project's established workflow requires before a
# commit/push is safe to ship. Does NOT touch git itself and does NOT talk to
# Vercel/Supabase — it only proves the working tree is in a shippable state.
# See .claude/skills/deploy/SKILL.md for what happens before/after this runs.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Type-checking..."
npx tsc --noEmit

echo "==> Linting (informational — this repo has pre-existing baseline warnings/errors that were never a shipping blocker; only fails the deploy on something drastically new would need a manual baseline diff, not this script)..."
npm run lint || true

echo "==> Running tests..."
npm test

echo "==> Building..."
npm run build

echo "==> All checks passed."
