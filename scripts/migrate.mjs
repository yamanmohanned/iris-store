#!/usr/bin/env node
// Applies pending SQL migrations from ./drizzle (plain Node: also runs inside the production image).
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✖ DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url, max: 1, application_name: "iris-migrate" });
try {
  const started = Date.now();
  await migrate(drizzle(pool), {
    migrationsFolder: path.resolve(process.env.MIGRATIONS_DIR ?? "drizzle"),
  });
  console.log(`✓ Migrations applied (${Date.now() - started} ms)`);
} catch (error) {
  console.error("✖ Migration failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
