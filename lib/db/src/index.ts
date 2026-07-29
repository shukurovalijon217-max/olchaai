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
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }   // Neon/Railway SSL — disable cert verification
    : undefined,
  max: 10,
  min: 1,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 8_000,     // fail fast if DB unreachable
  allowExitOnIdle: false,
});

// Log pool errors to prevent silent crashes
pool.on("error", (err) => {
  process.stderr.write(`[DB pool error] ${err.message}\n`);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
