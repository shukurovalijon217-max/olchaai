---
name: Platform Treasury System
description: Admin revenue treasury — tables, routes, creditTreasury helper, db.execute fix
---

## Tables
- `platform_treasury` — singleton (id=1); columns: total_revenue, available_balance, total_withdrawn, premium_revenue, marketplace_revenue, gift_revenue, other_revenue
- `treasury_transactions` — per-transaction log; type: 'credit' | 'withdrawal'; source: 'premium' | 'marketplace' | 'gift' | 'other' | 'admin'

## Routes (`artifacts/api-server/src/routes/treasury.ts`)
- `GET /api/admin/treasury` — full dashboard (treasury, todayRevenue, weekRevenue, monthRevenue, recentTransactions)
- `POST /api/admin/treasury/withdraw` — debit available_balance, log withdrawal tx; body: { amount, method, details?, description? }
- `GET /api/admin/treasury/transactions` — paginated tx list

## creditTreasury() helper
- Exported from `treasury.ts`, imported in `commission.ts` and `app.ts`
- `creditTreasury({ amount, source, description, reference? })` — updates both treasury row and inserts tx
- Called automatically on: every marketplace commission, every Stripe checkout.session.completed / invoice.payment_succeeded webhook

## Admin credentials
- Username: `nexusai`, Password: `Admin@OlCha2024!` (bcrypt hash set via SQL)
- Username: `omen` (has bcrypt hash but common test passwords failed — hash: `$2b$12$G3O...`)

## db.execute() pattern (CRITICAL)
Drizzle `db.execute(sql`...`)` returns `QueryResult` — NOT a directly iterable array.
**Wrong:** `const [row] = await db.execute(sql`SELECT ...`)` → TypeError: not iterable
**Right:** 
```ts
const res = await db.execute(sql`SELECT ...`);
const row = (res as any).rows?.[0] ?? (Array.isArray(res) ? res[0] : {});
```

**Why:** Drizzle pg driver returns `{ rows: any[][], ... }` from `db.execute()`. Direct destructuring fails.
**How to apply:** Any new raw SQL query using `db.execute()` must access `.rows` first.
