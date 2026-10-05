import { count, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { homeSections, pages, shippingZones } from "@/server/db/schema";
import { seedBase } from "@/server/seed";
import { getSettings } from "@/server/services/settings";
import { resetDatabase } from "@tests/support/db";

const total = async (table: typeof pages | typeof shippingZones | typeof homeSections) =>
  ((await db.select({ n: count() }).from(table)) as [{ n: number }])[0].n;

describe("base seed", () => {
  beforeEach(resetDatabase);

  it("prepares a new store for the chosen country and is idempotent", async () => {
    await seedBase({ country: "SA", storeName: { ar: "متجر الورد", en: "Rose Shop" } });
    await seedBase({ country: "SA" });

    const s = await getSettings();
    expect(s.general.currency).toBe("SAR");
    expect(s.general.currencyDecimals).toBe(2);
    expect(s.general.storeName.ar).toBe("متجر الورد");
    expect(await total(shippingZones)).toBe(13);
    expect(await total(pages)).toBe(5);
    expect(await total(homeSections)).toBe(5);

    const [privacy] = await db.select().from(pages).where(eq(pages.systemKey, "privacy"));
    expect(privacy!.content.ar).toContain("متجر الورد");
    expect(privacy!.content.ar).not.toContain("{{storeName}}");
  });
});
