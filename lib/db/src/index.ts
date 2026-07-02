import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // High-concurrency pool settings
  max: 20,                    // max simultaneous DB connections
  min: 2,                     // keep 2 connections warm (fast first-request)
  idleTimeoutMillis: 30_000,  // release idle connections after 30s
  connectionTimeoutMillis: 5_000, // fail fast if DB is unreachable (5s)
  allowExitOnIdle: false,     // keep pool alive in cluster workers
});

// Log pool errors to prevent silent crashes
pool.on("error", (err) => {
  process.stderr.write(`[DB pool error] ${err.message}\n`);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
