import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";

/** Empty every application table (keeps the schema). Call in `beforeEach` of integration suites. */
export async function resetDatabase() {
  const result = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );
  const tables = result.rows.map((r) => `"public"."${r.tablename}"`);
  if (tables.length === 0) return;
  // audit_logs refuses deletes unless the retention flag is set (TRUNCATE bypasses row triggers).
  await db.execute(sql.raw(`TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE`));
  await db.execute(sql`ALTER SEQUENCE order_number_seq RESTART WITH 10001`);
}

/** Drizzle wraps driver errors; this unwraps to the PostgreSQL message for assertions. */
export async function pgErrorOf(
  promise: Promise<unknown>,
): Promise<{ message: string; code?: string }> {
  try {
    await promise;
  } catch (error) {
    const cause = (error as { cause?: { message?: string; code?: string } }).cause;
    return { message: cause?.message ?? (error as Error).message, code: cause?.code };
  }
  throw new Error("Expected the query to fail, but it succeeded");
}
