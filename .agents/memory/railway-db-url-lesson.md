---
name: Railway olchaai-api DATABASE_URL lesson
description: Root cause of broken production login — Railway service had Render DATABASE_URL
---

## Rule
When production login fails with 502/429, check each Railway service's DATABASE_URL individually.

**Why:** Railway Variables per-service — `olchaai-nexus` and `olchaai-api` are separate services with separate variables. `olchaai-api` had `DATABASE_URL` pointing to the old Render PostgreSQL (now down). The fix was updating `DATABASE_URL` in the `olchaai-api` Railway service to the Neon URL (`NEON_DATABASE_URL`).

**How to apply:**
- Architecture: `olchaai-nexus` (serves olchaai.com, proxies /api/*) → `olchaai-api` (separate Railway service, Express API)
- Project IDs: project=`a17d9014-283c-46ed-8246-57b905aba237`, olchaai-api service=`b929257c-41d9-45d3-b46a-60dea5508915`, olchaai-nexus=`6a712054-7af1-4910-a96e-9e0696490b44`, environment=`3f9b1d72-2c6d-49db-b756-42ac52ba7a0`
- `olchaai-api-production.up.railway.app` is a REAL separate service, NOT a proxy loop
- `variableCollectionUpsert` Railway mutation returns "Not Authorized" with this token — must update manually via dashboard
- Neon URL: NEON_DATABASE_URL secret (126 chars, postgresql://neondb_owner:...)
