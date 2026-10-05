"use server";

import { refresh } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import type { FormState } from "@/lib/form-state";
import { field, toFormState } from "@/server/action-errors";
import { assertUser, getSession } from "@/server/auth/session";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { enforceRateLimit } from "@/server/security/rate-limit";
import {
  deleteAddress,
  MAX_ADDRESSES,
  saveAddress,
  setDefaultAddress,
} from "@/server/services/addresses";
import { toggleWishlist } from "@/server/services/wishlist";

const uuid = z.uuid();

async function currentUserId() {
  const { session } = await assertUser();
  await enforceRateLimit(`account:write:${session.user.id}`, 60, 60);
  return session.user.id;
}

// ── Addresses ────────────────────────────────────────────────────────────────

const ADDRESS_FIELDS = {
  label: 40,
  fullName: 80,
  phone: 30,
  zoneId: 40,
  city: 80,
  area: 120,
  street: 200,
  landmark: 200,
} as const;

export async function saveAddressAction(_prev: FormState, form: FormData): Promise<FormState> {
  const values = Object.fromEntries(
    Object.entries(ADDRESS_FIELDS).map(([name, max]) => [name, field(form, name, max)]),
  ) as Record<keyof typeof ADDRESS_FIELDS, string>;
  const id = field(form, "id", 40);
  try {
    const userId = await currentUserId();
    await saveAddress(
      userId,
      { ...values, isDefault: form.get("isDefault") === "on" },
      uuid.safeParse(id).success ? id : undefined,
    );
  } catch (error) {
    const t = await getTranslations();
    if (isAppError(error) && error.code === "VALIDATION" && error.details?.field === "phone")
      return { ok: false, fieldErrors: { phone: t("checkout.errors.phone") }, values };
    if (isAppError(error) && error.code === "CONFLICT" && error.details?.limit)
      return { ok: false, message: t("account.addresses.limit", { max: MAX_ADDRESSES }), values };
    return toFormState(error, values);
  }
  refresh();
  const t = await getTranslations("account.addresses");
  return { ok: true, message: t("saved") };
}

export async function deleteAddressAction(addressId: string): Promise<{ ok: boolean }> {
  if (!uuid.safeParse(addressId).success) return { ok: false };
  try {
    await deleteAddress(await currentUserId(), addressId);
    refresh();
    return { ok: true };
  } catch (error) {
    logger.warn({ err: error }, "delete address failed");
    return { ok: false };
  }
}

export async function setDefaultAddressAction(addressId: string): Promise<{ ok: boolean }> {
  if (!uuid.safeParse(addressId).success) return { ok: false };
  try {
    await setDefaultAddress(await currentUserId(), addressId);
    refresh();
    return { ok: true };
  } catch (error) {
    logger.warn({ err: error }, "set default address failed");
    return { ok: false };
  }
}

// ── Wishlist ─────────────────────────────────────────────────────────────────

export type WishlistResult =
  { ok: true; saved: boolean } | { ok: false; needsSignIn?: boolean; message?: string };

/** Heart button on product pages and the wishlist grid. Guests are asked to sign in. */
export async function toggleWishlistAction(productId: string): Promise<WishlistResult> {
  if (!uuid.safeParse(productId).success) return { ok: false };
  if (!(await getSession())) return { ok: false, needsSignIn: true };
  const t = await getTranslations("wishlist");
  try {
    const saved = await toggleWishlist(await currentUserId(), productId);
    refresh();
    return { ok: true, saved };
  } catch (error) {
    if (isAppError(error) && error.code === "CONFLICT") return { ok: false, message: t("full") };
    if (isAppError(error) && error.code === "RATE_LIMITED")
      return { ok: false, message: (await getTranslations("errors"))("rateLimited") };
    logger.warn({ err: error }, "wishlist toggle failed");
    return { ok: false, message: (await getTranslations("cart"))("updateFailed") };
  }
}
