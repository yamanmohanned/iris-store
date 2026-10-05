import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { db } from "@/server/db/client";
import { auditLogs } from "@/server/db/schema";
import { getBrandAssets } from "@/server/services/brand-assets";
import { storeImage } from "@/server/services/media";
import { getSettings } from "@/server/services/settings";
import {
  clearStoreCache,
  isEditableSection,
  saveSettingsSection,
} from "@/server/services/settings-admin";
import { createVerifiedUser } from "@tests/support/auth";
import { resetDatabase } from "@tests/support/db";

async function owner() {
  const user = await createVerifiedUser({
    email: "owner@example.com",
    password: "Calm-River-Stone-2026",
    role: "owner",
  });
  return { id: user.id, label: user.email };
}

describe("store settings (admin)", () => {
  beforeEach(resetDatabase);

  it("saves a section but never the values fixed at setup", async () => {
    const actor = await owner();
    const before = (await getSettings()).general;
    await saveSettingsSection(
      "general",
      {
        storeName: { ar: "متجر الورد", en: "Rose Store" },
        currency: "USD",
        currencyDecimals: 2,
        country: "SA",
        setupCompletedAt: null,
        contact: { ...before.contact, phone: "+964 770 123 4567" },
      },
      actor,
    );
    const after = (await getSettings()).general;
    expect(after.storeName).toEqual({ ar: "متجر الورد", en: "Rose Store" });
    expect(after.contact.phone).toBe("+964 770 123 4567");
    expect(after).toMatchObject({
      currency: before.currency,
      currencyDecimals: before.currencyDecimals,
      country: before.country,
      setupCompletedAt: before.setupCompletedAt,
    });
    const [log] = await db.select().from(auditLogs);
    expect(log).toMatchObject({
      action: "settings.update",
      actorId: actor.id,
      entityId: "general",
    });
  });

  it("rejects a missing store name, unknown images and invalid values", async () => {
    const actor = await owner();
    await expect(
      saveSettingsSection("general", { storeName: { ar: " " } }, actor),
    ).rejects.toMatchObject({ code: "VALIDATION", details: { field: "storeName" } });
    await expect(
      saveSettingsSection(
        "general",
        { storeName: { ar: "متجر" }, logoMediaId: randomUUID() },
        actor,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION", details: { field: "logoMediaId" } });
    await expect(
      saveSettingsSection("branding", { primaryColor: "purple" }, actor),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      saveSettingsSection(
        "notifications",
        { adminEmails: ["owner@example.com", "not-an-email"] },
        actor,
      ),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      saveSettingsSection(
        "checkout",
        { cod: { enabled: false }, bankTransfer: { enabled: false } },
        actor,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION", details: { field: "payments" } });
    expect(isEditableSection("general")).toBe(true);
    expect(isEditableSection("constructor")).toBe(false);
  });

  it("serves the logo and share image once saved", async () => {
    const actor = await owner();
    const png = await sharp({
      create: {
        width: 600,
        height: 200,
        channels: 4,
        background: { r: 61, g: 44, b: 141, alpha: 0.6 },
      },
    })
      .png()
      .toBuffer();
    const logo = await storeImage(png, { originalName: "logo.png", createdBy: actor.id });
    await saveSettingsSection(
      "general",
      { storeName: { ar: "متجر" }, logoMediaId: logo.id },
      actor,
    );
    await saveSettingsSection("seo", { ogImageMediaId: logo.id, title: { ar: "عنوان" } }, actor);

    const brand = await getBrandAssets();
    expect(brand.logo?.id).toBe(logo.id);
    expect(brand.logo?.src).toMatch(/\.webp$/);
    expect(brand.shareImage?.id).toBe(logo.id);

    await saveSettingsSection("general", { storeName: { ar: "متجر" }, logoMediaId: null }, actor);
    expect((await getBrandAssets()).logo).toBeNull();
  });

  it("audits a cache refresh", async () => {
    const actor = await owner();
    await clearStoreCache(actor);
    const actions = (await db.select().from(auditLogs)).map((l) => l.action);
    expect(actions).toEqual(["cache.clear"]);
  });
});
