import { expect, test } from "@playwright/test";
import { CRON_SECRET } from "./helpers";

test.describe("scheduled jobs endpoint", () => {
  test.skip(({ isMobile }) => !isMobile, "server-only: runs once");

  test("runs jobs only with the cron secret", async ({ request }) => {
    const auth = (secret: string) => ({ headers: { Authorization: `Bearer ${secret}` } });

    expect((await request.post("/api/cron/cleanup")).status()).toBe(401);
    expect((await request.post("/api/cron/cleanup", auth("wrong-secret"))).status()).toBe(401);
    expect((await request.post("/api/cron/everything", auth(CRON_SECRET))).status()).toBe(404);

    const cleanup = await request.post("/api/cron/cleanup", auth(CRON_SECRET));
    expect(cleanup.status()).toBe(200);
    expect(cleanup.headers()["cache-control"]).toContain("no-store");
    expect(await cleanup.json()).toMatchObject({ ok: true, job: "cleanup" });

    const outbox = await request.get("/api/cron/outbox", auth(CRON_SECRET));
    expect(await outbox.json()).toMatchObject({ ok: true, job: "outbox" });
  });
});
