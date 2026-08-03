---
name: Railway env var surrounding-quote bug
description: Railway variables can be stored with surrounding double-quotes as part of the value, causing downstream crashes at module load time.
---

# Railway env var surrounding-quote bug

## The rule
Always check Railway variable values for accidental surrounding quotes (`"https://..."`) when a service crashes at startup with a library-level URL or config validation error.

**Why:** A Railway variable `UPSTASH_REDIS_REST_URL` was stored as `"https://devoted-malamute-91393.upstash.io"` (with literal double-quotes as part of the value, not just shell quoting). This caused `@upstash/redis` to throw `UrlError` at module load time — crashing the bundled API before it could bind to port 3001 — making all `/api/*` endpoints return HTTP 502.

**How to apply:**
- When a production service crashes with a config/URL validation error on startup, query Railway variables via GraphQL API and `print(repr(v))` to see the raw value including any quote characters.
- Fix via `variableCollectionUpsert` mutation (projectId, environmentId, serviceId).
- In code: add a `stripQuotes()` helper + `try/catch` around any library init that throws on bad config — bad config should always fall back gracefully, never crash the process.

## How to fix Railway variables via API
```
mutation variableCollectionUpsert(input: {
  projectId, environmentId, serviceId,
  replace: false,
  skipDeploys: false,   # set true to fix without triggering deploy
  variables: { KEY: "corrected-value" }
})
```

## How to trigger a Railway rebuild (not just restart)
Use `serviceInstanceDeploy(environmentId, serviceId, latestCommit: true)` — NOT `serviceInstanceRedeploy` which only restarts the existing container without rebuilding from the new commit.

## Production IDs (olchaai project)
- projectId: `a17d9014-283c-46ed-8246-57b905aba237`
- environmentId (production): `3f9b1d72-2c6d-49db-b756-42ac52ba7aa0`
- serviceId (olchaai-nexus): `6a712054-7af1-4910-a96e-9e0696490b44`
