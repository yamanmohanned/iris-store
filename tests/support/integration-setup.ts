// Integration tests always talk to the dedicated test database.
if (process.env.DATABASE_URL_TEST) process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.AUTH_SECRET ??= "integration-test-secret-integration-test-secret";
process.env.APP_URL ??= "http://localhost:3000";
