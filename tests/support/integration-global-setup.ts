import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

/**
 * Runs once per `vitest --project integration` invocation:
 * wipes the dedicated test database and applies every migration from scratch.
 */
export default async function setup() {
  process.loadEnvFile?.(".env");
  const url = process.env.DATABASE_URL_TEST;
  if (!url)
    throw new Error("DATABASE_URL_TEST is required for integration tests (see .env.example)");
  if (!/test/i.test(new URL(url).pathname)) {
    throw new Error(
      `Refusing to wipe "${new URL(url).pathname}": test database name must contain "test"`,
    );
  }

  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await pool.query(
      "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE;",
    );
    await pool.query("CREATE SCHEMA public;");
    await migrate(drizzle(pool), { migrationsFolder: path.resolve("drizzle") });
  } finally {
    await pool.end();
  }
}
