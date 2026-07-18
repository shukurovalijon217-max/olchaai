import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const dbUrl = process.env.DATABASE_URL!;
// Only force SSL for Neon (requires it). Render internal connections (.internal)
// do NOT support SSL — never force SSL on them even in production.
const needsSsl = dbUrl.includes("neon.tech") ||
  (dbUrl.includes("sslmode=require") && !dbUrl.includes(".internal"));

export const pool = new Pool({
  connectionString: dbUrl,
  max: 20,
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
