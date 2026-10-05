// Minimal, deterministic environment for unit tests (no database access).
process.env.AUTH_SECRET ??= "unit-test-secret-unit-test-secret-unit-test";
process.env.DATABASE_URL ??= "postgres://unused:unused@localhost:1/unused";
process.env.APP_URL ??= "http://localhost:3000";
