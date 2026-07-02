---
name: AI Admin Actions System
description: Autonomous AI-driven moderation — table, routes, sweep logic, frontend panel
---

## Table
- `ai_admin_actions` — inline pgTable in `aiAdminActions.ts`; columns: id, action_type, target_type, target_id, reason, confidence, status, details (jsonb), executed_at, overridden_by_admin, admin_override_note

## Routes (`artifacts/api-server/src/routes/aiAdminActions.ts`)
- `GET /api/admin/ai-actions` — list with pagination; returns actions + totalActions/todayActions/byType
- `POST /api/admin/ai-actions/run` — triggers autonomous sweep (auto-ban warned users, remove flagged posts, cleanup expired stories, deactivate stale listings)
- `GET /api/admin/ai-actions/stats` — summary stats with autoban/removedPosts/overridden counts
- `POST /api/admin/ai-actions/:id/override` — admin can override an AI decision

## Sweep logic (run endpoint)
Each step is wrapped in try-catch so one failing table doesn't kill the whole sweep:
1. Remove posts flagged for >24h (posts table, is_flagged=true)
2. Auto-ban users with 3+ warnings (users table, warning_count >= 3)
3. Cleanup expired stories (stories table, expires_at < NOW())
4. Deactivate stale marketplace listings (marketplace_listings table — may not exist, skip gracefully)

## Frontend
- `AiAdminActionsPanel` component in `AdminPage.tsx` — embedded inside `AiAutopilotTab` at the bottom
- Shows stats badges (ban count, removed posts, overridden), sweep button, and scrollable action log
- Override button marks action as overridden via PATCH

**Why:** The sweep endpoint must be resilient — not all tables exist in every env; always wrap per-step queries in try-catch.
