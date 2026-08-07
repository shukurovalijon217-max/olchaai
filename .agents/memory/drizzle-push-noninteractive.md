---
name: Drizzle push must stay non-interactive
description: Why drizzle-kit push prompts (and hangs post-merge setup) and how to keep the diff clean
---

The post-merge script runs `pnpm --filter db push` with stdin closed; ANY drizzle prompt kills it.

**Why it prompts:**
- Tables existing in the DB but not in `lib/db/src/schema` (e.g. defined inline in api-server routes) → push wants to DROP them and asks. Fix: declare them in `lib/db/src/schema/legacy.ts` (introspect with `drizzle-kit pull`), never let inline-only tables drift.
- Unique constraint NAME or COLUMN-ORDER mismatches between schema and DB (e.g. DB `<t>_<col>_key` vs drizzle default `<t>_<col>_unique`, or `.on(a,b)` vs DB `(b,a)`) → truncate prompt. Fix by renaming the DB constraint / matching column order, not by answering the prompt.
- New table + previously-dropped table in the same diff → rename-or-create prompt. Pre-create the table with matching DDL via psql.

**How to apply:** when a merge adds schema, apply the DDL manually to BOTH dev (`$DATABASE_URL`) and prod (`$NEON_DATABASE_URL`) via psql, then verify `drizzle-kit push < /dev/null` prints "No changes detected". To see what a prompt is asking, drive it through a Python pty.

**Why:** 4 production deploys failed and post-merge setup timed out repeatedly before this was root-caused (Aug 2026).
