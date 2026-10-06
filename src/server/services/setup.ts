import "server-only";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { COUNTRY_PRESETS } from "@/lib/countries";
import { db } from "@/server/db/client";
import { accounts, users } from "@/server/db/schema";
import { env } from "@/server/env";
import { AppError } from "@/server/errors";
import {
  checkPasswordPolicy,
  hashPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/server/security/password";
import { enforceRateLimit } from "@/server/security/rate-limit";
import { secretMatches } from "@/server/security/secrets";
import { seedBase } from "@/server/seed";
import { audit } from "./audit";
import { getSetting, updateSetting } from "./settings";

export const setupSchema = z.object({
  token: z.string().trim().min(1).max(200),
  storeNameAr: z.string().trim().min(2).max(80),
  storeNameEn: z.string().trim().max(80).optional().default(""),
  country: z.enum(COUNTRY_PRESETS.map((c) => c.code) as [string, ...string[]]),
  ownerName: z.string().trim().min(2).max(80),
  email: z
    .email()
    .max(254)
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});
export type SetupInput = z.input<typeof setupSchema>;

export async function ownerExists(): Promise<boolean> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "owner"))
    .limit(1);
  return rows.length > 0;
}

/** Setup is possible only while no owner exists AND a SETUP_TOKEN is configured. */
export async function setupAvailable(): Promise<boolean> {
  return Boolean(env().SETUP_TOKEN) && !(await ownerExists());
}

function tokenMatches(provided: string): boolean {
  return secretMatches(provided, env().SETUP_TOKEN);
}

/**
 * Create the store owner. The SETUP_TOKEN proves the person controls the deployment (prevents a
 * stranger from claiming a freshly deployed store). An advisory lock makes concurrent attempts safe.
 */
export async function createOwnerAccount(
  input: { name: string; email: string; password: string },
  meta: { ip?: string | null; via: "wizard" | "cli" },
) {
  const problem = checkPasswordPolicy(input.password, { email: input.email, name: input.name });
  if (problem)
    throw new AppError("VALIDATION", "weak password", { field: "password", password: problem });
  const passwordHash = await hashPassword(input.password);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('iris:create-owner'))`);
    const existingOwner = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "owner"))
      .limit(1);
    if (existingOwner.length) throw new AppError("CONFLICT", "owner already exists");
    const sameEmail = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    if (sameEmail.length)
      throw new AppError("CONFLICT", "email already registered", { field: "email" });

    const [owner] = await tx
      .insert(users)
      .values({ name: input.name, email: input.email, emailVerified: true, role: "owner" })
      .returning();
    await tx.insert(accounts).values({
      userId: owner!.id,
      accountId: owner!.id,
      providerId: "credential",
      password: passwordHash,
    });
    await audit(
      {
        action: "setup.owner_created",
        actorId: owner!.id,
        actorLabel: owner!.email,
        metadata: { via: meta.via },
        ipAddress: meta.ip ?? null,
      },
      tx,
    );
    return owner!;
  });
}

/** First-run wizard: verifies the token, prepares the store for the country, creates the owner. */
export async function completeSetup(raw: SetupInput, meta: { ip: string | null }) {
  await enforceRateLimit(`setup:ip:${meta.ip ?? "unknown"}`, 10, 60 * 60);
  const input = setupSchema.parse(raw);
  if (!tokenMatches(input.token))
    throw new AppError("FORBIDDEN", "invalid setup token", { field: "token" });
  if (await ownerExists()) throw new AppError("CONFLICT", "setup already completed");

  const owner = await createOwnerAccount(
    { name: input.ownerName, email: input.email, password: input.password },
    { ip: meta.ip, via: "wizard" },
  );
  await seedBase({
    country: input.country,
    storeName: { ar: input.storeNameAr, en: input.storeNameEn || input.storeNameAr },
  });
  // seedBase only fills sections that don't exist yet; apply the owner's choices explicitly.
  const general = await getSetting("general");
  const preset = COUNTRY_PRESETS.find((c) => c.code === input.country)!;
  await updateSetting(
    "general",
    {
      storeName: { ar: input.storeNameAr, en: input.storeNameEn || input.storeNameAr },
      country: preset.code,
      currency: preset.currency,
      currencyDecimals: preset.currencyDecimals,
      phoneCode: preset.phoneCode,
      timeZone: preset.timeZone,
      contact: { ...general.contact, email: general.contact.email || input.email },
      setupCompletedAt: new Date().toISOString(),
    },
    { id: owner.id, label: owner.email },
  );
  return owner;
}
