import os from "node:os";
import path from "node:path";
import { afterAll } from "vitest";

// Integration tests always talk to the dedicated test database.
process.loadEnvFile?.(".env");
if (process.env.DATABASE_URL_TEST) process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.AUTH_SECRET ??= "integration-test-secret-integration-test-secret";
process.env.APP_URL ??= "http://localhost:3000";
process.env.EMAIL_DRIVER = "console";
process.env.LOG_LEVEL = "silent";
process.env.STORAGE_DRIVER = "local";
process.env.STORAGE_LOCAL_DIR = path.join(os.tmpdir(), `iris-test-storage-${process.pid}`);

afterAll(async () => {
  const { closeDb } = await import("@/server/db/client");
  await closeDb();
});
