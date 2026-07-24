import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}
// Only force SSL for Neon (requires it). Render internal connections (.internal)
// do NOT support SSL — never force SSL on them even in production.
const needsSsl = dbUrl.includes("neon.tech") ||
  (dbUrl.includes("sslmode=require") && !dbUrl.includes(".internal"));

// Per-worker pool size: total DB connections = DB_POOL_MAX × WEB_CONCURRENCY workers.
// Default: 10 per worker × 2 workers = 20 total (safe for Railway Hobby/Pro).
// Set DB_POOL_MAX env var to tune per your Railway plan's DB connection limit.
const perWorkerMax = Math.max(5, parseInt(process.env["DB_POOL_MAX"] ?? "10", 10));

export const pool = new Pool({
  connectionString: dbUrl,
  max: perWorkerMax,
  min: 2,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  allowExitOnIdle: false,
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on("error", (err) => {
  process.stderr.write(`[DB pool error] ${err.message}\n`);
});

export const db = drizzle(pool, { schema });

/* ── Read Replica pool (optional) ──────────────────────────────────
 * Set READ_REPLICA_DATABASE_URL env var on Render to point at the
 * read replica. Falls back to primary db when not configured.
 * Use readDb for heavy SELECT-only queries (feed, search, profile).
 * ─────────────────────────────────────────────────────────────── */
const readReplicaUrl = process.env.READ_REPLICA_DATABASE_URL;
let _readPool: pg.Pool | null = null;
let _readDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

if (readReplicaUrl) {
  _readPool = new Pool({
    connectionString: readReplicaUrl,
    max: 10,
    min: 1,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    allowExitOnIdle: false,
  });
  _readPool.on("error", (err) => {
    process.stderr.write(`[Read replica pool error] ${err.message}\n`);
  });
  _readDb = drizzle(_readPool, { schema });
}

export const readDb: typeof db = (_readDb as typeof db) ?? db;
export const readPool: pg.Pool = _readPool ?? pool;

export * from "./schema";
