import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/server/env";
import { logger } from "@/server/logger";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema> & { $client: Pool };
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Anything that can run queries: the root db or an open transaction. */
export type DbExecutor = Database | Transaction;

type Holder = { pool: Pool; db: Database };
// Survive hot reloads in development without leaking pools.
const globalForDb = globalThis as unknown as { __irisDb?: Holder };

function createDb(url: string, max: number): Holder {
  const pool = new Pool({
    connectionString: url,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // A runaway query must not hold a connection forever.
    statement_timeout: 15_000,
    application_name: "iris-store",
  });
  pool.on("error", (err) => logger.error({ err }, "postgres pool error"));
  const db = drizzle(pool, { schema, casing: "snake_case" }) as Database;
  return { pool, db };
}

export function getDb(): Database {
  if (!globalForDb.__irisDb) {
    const { DATABASE_URL, DATABASE_POOL_MAX } = env();
    globalForDb.__irisDb = createDb(DATABASE_URL, DATABASE_POOL_MAX);
  }
  return globalForDb.__irisDb.db;
}

/** Lazily-initialised database (no connection is opened at import time, e.g. during `next build`). */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export async function closeDb() {
  const holder = globalForDb.__irisDb;
  globalForDb.__irisDb = undefined;
  await holder?.pool.end();
}
