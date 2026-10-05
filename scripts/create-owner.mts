/**
 * Create the store owner from the command line (alternative to the /setup wizard).
 *   OWNER_PASSWORD='…' pnpm create-owner --email=owner@example.com --name="Owner Name" [--country=IQ]
 * The password is read from the environment so it never lands in shell history.
 */
import { closeDb } from "@/server/db/client";
import { seedBase } from "@/server/seed";
import { createOwnerAccount } from "@/server/services/setup";

const arg = (name: string) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
const email = arg("email")?.trim().toLowerCase();
const name = arg("name")?.trim() || "Owner";
const password = process.env.OWNER_PASSWORD ?? "";

if (!email || !password) {
  console.error(
    "Usage: OWNER_PASSWORD='…' pnpm create-owner --email=owner@example.com --name=\"Owner\" [--country=IQ]",
  );
  process.exit(1);
}

try {
  await seedBase({ country: arg("country") });
  const owner = await createOwnerAccount({ name, email, password }, { via: "cli" });
  console.log(
    `✓ Owner created: ${owner.email}. Sign in at /login, then enable two-step verification.`,
  );
} catch (error) {
  console.error("✖", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await closeDb();
}
