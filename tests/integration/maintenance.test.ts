import { randomBytes, randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import {
  carts,
  outboxMessages,
  rateLimitBuckets,
  sessions,
  users,
  verifications,
} from "@/server/db/schema";
import { runCleanupJob, runOutboxJob } from "@/server/services/maintenance";
import { resetDatabase } from "@tests/support/db";

const DAY = 86_400_000;
const ago = (ms: number) => new Date(Date.now() - ms);
const ahead = (ms: number) => new Date(Date.now() + ms);

describe("scheduled jobs", () => {
  beforeEach(resetDatabase);

  it("delivers due notifications in batches until none are left", async () => {
    // Orders that no longer exist: delivery has nothing to send and marks them done.
    await db.insert(outboxMessages).values(
      Array.from({ length: 45 }, () => ({
        channel: "email" as const,
        recipient: "zainab@example.com",
        template: "order_placed",
        payload: { orderId: randomUUID() },
      })),
    );
    // Not due yet: left for a later run.
    await db.insert(outboxMessages).values({
      channel: "email",
      recipient: "later@example.com",
      template: "order_placed",
      payload: { orderId: randomUUID() },
      nextAttemptAt: ahead(DAY),
    });
    const result = await runOutboxJob({ batch: 20 });
    expect(result).toMatchObject({ sent: 45, failed: 0, rounds: 3 });
    expect(
      (await db.select().from(outboxMessages)).filter((m) => m.status === "pending"),
    ).toHaveLength(1);
  });

  it("removes only what has expired", async () => {
    const [user] = await db
      .insert(users)
      .values({ name: "Zainab", email: "zainab@example.com", emailVerified: true })
      .returning();
    const token = () => randomBytes(16).toString("hex");

    await db.insert(carts).values([
      { tokenHash: token(), expiresAt: ago(DAY) },
      { tokenHash: token(), expiresAt: ahead(DAY) },
    ]);
    await db.insert(sessions).values([
      { userId: user!.id, token: token(), expiresAt: ago(1000) },
      { userId: user!.id, token: token(), expiresAt: ahead(DAY) },
    ]);
    await db.insert(verifications).values([
      { identifier: "otp:old", value: "x", expiresAt: ago(2 * DAY) },
      { identifier: "otp:new", value: "y", expiresAt: ahead(600_000) },
    ]);
    await db.insert(rateLimitBuckets).values([
      { key: "login:ip:old", count: 3, resetAt: ago(1000) },
      { key: "login:ip:new", count: 1, resetAt: ahead(60_000) },
    ]);
    await db.insert(outboxMessages).values([
      {
        channel: "email",
        recipient: "a@example.com",
        template: "t",
        payload: {},
        status: "sent",
        sentAt: ago(40 * DAY),
      },
      {
        channel: "email",
        recipient: "b@example.com",
        template: "t",
        payload: {},
        status: "sent",
        sentAt: ago(DAY),
      },
      {
        channel: "email",
        recipient: "c@example.com",
        template: "t",
        payload: {},
        status: "failed",
        createdAt: ago(100 * DAY),
      },
      {
        channel: "email",
        recipient: "d@example.com",
        template: "t",
        payload: {},
        status: "pending",
        createdAt: ago(100 * DAY),
      },
    ]);

    expect(await runCleanupJob()).toEqual({
      carts: 1,
      rateLimitBuckets: 1,
      sessions: 1,
      verifications: 1,
      emails: 2,
    });
    expect(await db.select().from(carts)).toHaveLength(1);
    expect(await db.select().from(sessions)).toHaveLength(1);
    expect((await db.select().from(verifications)).map((v) => v.identifier)).toEqual(["otp:new"]);
    expect((await db.select().from(rateLimitBuckets)).map((b) => b.key)).toEqual(["login:ip:new"]);
    expect((await db.select().from(outboxMessages)).map((m) => m.recipient).sort()).toEqual([
      "b@example.com",
      "d@example.com",
    ]);
    // A second run finds nothing left to do.
    expect(await runCleanupJob()).toEqual({
      carts: 0,
      rateLimitBuckets: 0,
      sessions: 0,
      verifications: 0,
      emails: 0,
    });
  });
});
