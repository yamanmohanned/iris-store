import { execSync } from "node:child_process";
import { rm } from "node:fs/promises";
import { clearMail, OWNER_FILE, PASSWORD, STAFF_EMAIL, STAFF_TOTP_FILE } from "./helpers";

/**
 * Fresh database for every E2E run: wipe, migrate, seed the demo store.
 * Uses DATABASE_URL_E2E (must contain "e2e" or "test" so a real database can never be wiped).
 */
export default async function globalSetup() {
  process.loadEnvFile?.(".env");
  const url = process.env.DATABASE_URL_E2E ?? process.env.DATABASE_URL_TEST;
  if (!url || !/(e2e|test)/i.test(new URL(url).pathname)) {
    throw new Error("Set DATABASE_URL_E2E (database name must contain 'e2e' or 'test')");
  }
  const env = { ...process.env, DATABASE_URL: url };
  execSync(
    `psql "${url}" -v ON_ERROR_STOP=1 -qc "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;"`,
    { stdio: "inherit", env },
  );
  execSync("node scripts/migrate.mjs", { stdio: "inherit", env });
  execSync("pnpm -s db:seed:demo", { stdio: "inherit", env });
  execSync(
    `pnpm -s tsx --conditions=react-server tests/e2e/fixtures/create-staff.mts ${STAFF_EMAIL} ${PASSWORD} admin`,
    { stdio: "inherit", env },
  );
  await rm(STAFF_TOTP_FILE, { force: true });
  await rm(OWNER_FILE, { force: true });
  await clearMail();
}
