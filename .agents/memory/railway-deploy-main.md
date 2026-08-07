---
name: Railway deploy branch
description: Which git branch Railway actually builds from and how to trigger a rebuild.
---

# Railway deploy branch

## The rule
Railway (olchaai-nexus service) builds from the **`replit-agent`** branch of the GitHub repo — NOT `main`. Pushing to `main` alone never deploys anything.

**Why:** On 2026-08-04 discovered via deployment meta (`"branch":"replit-agent"`) that weeks of pushes to `main` were never deployed; production stayed on a stale commit. Verified by deployment query, not assumption — an earlier memory wrongly claimed `main`.

**How to apply:**
1. Push work to `main` (source of truth), then mirror: `git push origin main:replit-agent --force`.
2. Trigger rebuild: `serviceInstanceDeploy(environmentId, serviceId, latestCommit: true)` GraphQL mutation (NOT serviceInstanceRedeploy — that only restarts).
3. Verify: query `deployments(first:1, ...)` and check `meta.branch` + `meta.commitHash` match what you pushed.
4. Auto-deploy from GitHub is NOT active; every deploy must be triggered via API.

**2026-08-07:** RAILWAY_TOKEN returned "Not Authorized" for ALL GraphQL queries (projects, project(id), environment, deployments, variables) in both Bearer and Project-Access-Token header modes — token likely rotated/expired. User must issue a fresh token before any deploy/variable work.

IDs are in railway-env-var-quotes.md.
