/**
 * E2E fixture: a staff account with a known password (2FA is enabled through the UI on first
 * sign-in by `signInAsStaff`). Run by global-setup against the E2E database only.
 */
import { eq } from "drizzle-orm";
import { closeDb, db } from "@/server/db/client";
import { accounts, users } from "@/server/db/schema/auth";
import { hashPassword } from "@/server/security/password";

const [email, password, role = "admin"] = process.argv.slice(2);
if (!email || !password || !/(e2e|test)/i.test(process.env.DATABASE_URL ?? "")) {
  console.error("refusing to run outside the E2E/test database");
  process.exit(1);
}
const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
if (!existing) {
  const [user] = await db
    .insert(users)
    .values({ name: "فريق الطلبات", email, emailVerified: true, role: role as never })
    .returning();
  await db.insert(accounts).values({
    userId: user!.id,
    accountId: user!.id,
    providerId: "credential",
    password: await hashPassword(password),
  });
}
await closeDb();
