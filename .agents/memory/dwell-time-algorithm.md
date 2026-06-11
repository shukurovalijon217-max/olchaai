---
name: Dwell Time Algorithm
description: How dwell time tracking works end-to-end — from IntersectionObserver to AI feed scoring.
---

## Rule
Dwell time is tracked by `useDwellTracker` hook and fed into the AI algorithm via the `userInteractionsTable.durationMs` field.

**Why:** The `durationMs` field already existed on the interactions table. Dwell time reveals true interest signal beyond passive scrolls.

## How to apply
- **Frontend hook**: `artifacts/nexus/src/hooks/useDwellTracker.ts` — wraps IntersectionObserver, fires when post leaves viewport or component unmounts. Minimum threshold: 800ms.
- **PostCard integration**: `ref={dwellRef as any}` on the `motion.div` — `motion.div` accepts ref callbacks via forwardRef.
- **AI feed** (`/api/ai/feed`): View interactions now included (not filtered out). Weight formula: `1 + Math.min(durationMs / 10000, 3)` — gives 1pt for fleeting views, up to 4pt for 30s+ deep reads.
- **Freshness boost**: posts under 24h get up to +3pts that decay at +3 - ageHours/8.
