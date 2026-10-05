import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { auditLogs, settings } from "@/server/db/schema";
import { ensureDefaultSettings, getSettings, updateSetting } from "@/server/services/settings";
import { resetDatabase } from "@tests/support/db";

describe("settings service", () => {
  beforeEach(resetDatabase);

  it("returns complete defaults when nothing is stored", async () => {
    const s = await getSettings();
    expect(s.general.currency).toBe("IQD");
    expect(s.general.storeName.ar).toBe("متجر Iris");
    expect(s.checkout.cod.enabled).toBe(true);
    expect(s.branding.primaryColor).toMatch(/^#/);
  });

  it("merges partial updates, validates them and writes an audit record", async () => {
    await ensureDefaultSettings();
    const next = await updateSetting("checkout", { minOrderAmount: 10_000 }, null);
    expect(next.minOrderAmount).toBe(10_000);
    expect(next.cod.enabled).toBe(true); // untouched fields survive

    const logs = await db.select().from(auditLogs).where(eq(auditLogs.action, "settings.update"));
    expect(logs.at(-1)?.entityId).toBe("checkout");
  });

  it("rejects invalid values", async () => {
    await expect(updateSetting("branding", { primaryColor: "red" }, null)).rejects.toThrow();
    await expect(
      updateSetting(
        "checkout",
        { tax: { enabled: true, rateBps: 50_000, pricesIncludeTax: true } },
        null,
      ),
    ).rejects.toThrow();
  });

  it("falls back to defaults when a stored section is corrupted", async () => {
    await db.insert(settings).values({ key: "branding", value: { primaryColor: 42 } });
    const s = await getSettings();
    expect(s.branding.primaryColor).toBe("#6b3fd4");
  });

  it("applies overrides only when creating missing sections", async () => {
    await ensureDefaultSettings({ general: { currency: "SAR", currencyDecimals: 2 } });
    await ensureDefaultSettings({ general: { currency: "KWD" } });
    expect((await getSettings()).general.currency).toBe("SAR");
  });
});
