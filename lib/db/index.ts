// Neon Postgres connection + the app-wide `getDb()` accessor.
// Set DATABASE_URL to your Neon connection string (use the pooled "-pooler" host for serverless/many connections).
import { Pool } from "pg";
import { Db } from "./query";

export { ident } from "./query";
export type { DbError, DbResult } from "./query";

const g = globalThis as unknown as { __kvlPool?: Pool };

export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function pool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!g.__kvlPool) {
    g.__kvlPool = new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_MAX ?? 10), idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000 });
    g.__kvlPool.on("error", (err) => console.error("[db] idle client error:", err.message)); // a dropped idle connection must never crash the process
  }
  return g.__kvlPool;
}

const db = new Db(pool);

/** Server-side database handle. Never throws; without DATABASE_URL every query returns an error result (demo-mode fallbacks kick in). */
export function getDb(): Db {
  return db;
}

/** Closes the pool (tests / scripts). */
export async function closeDb(): Promise<void> {
  if (g.__kvlPool) { await g.__kvlPool.end(); g.__kvlPool = undefined; }
}
