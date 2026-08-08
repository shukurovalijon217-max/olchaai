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

**2026-08-07:** RAILWAY_TOKEN is now a PROJECT token — use header `Project-Access-Token: $RAILWAY_TOKEN`, NOT `Authorization: Bearer` (Bearer gives "Not Authorized" everywhere). Verify with `query { projectToken { projectId environmentId } }`. Also: after the user updates a secret, the CodeExecution `requestSecrets` callback may return a stale/empty value — read the fresh value from the shell environment (`$RAILWAY_TOKEN`) instead. Prod services: olchaai-nexus (6a712054…), olchaai-go (972e0bb7…), olchaai-ai-core (66c2ab20…), olchaai-db.

IDs are in railway-env-var-quotes.md.
