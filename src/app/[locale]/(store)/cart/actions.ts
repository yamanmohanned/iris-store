"use server";

import { refresh } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import type { FormState } from "@/lib/form-state";
import { formatMoney } from "@/lib/money";
import { field } from "@/server/action-errors";
import { getSession, requestIp } from "@/server/auth/session";
import { ensureRequestCartId, getRequestCartId } from "@/server/cart-session";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { enforceRateLimit } from "@/server/security/rate-limit";
import {
  addCartItem,
  countCartItems,
  getCartView,
  removeCartItem,
  setCartCoupon,
  updateCartItem,
  type CartActionResult,
} from "@/server/services/cart";
import { priceCart } from "@/server/services/checkout";
import { normalizeCouponCode } from "@/server/services/coupons";
import { getSettings } from "@/server/services/settings";

const uuid = z.uuid();

async function limitCartWrites() {
  await enforceRateLimit(`cart:ip:${(await requestIp()) ?? "unknown"}`, 120, 60);
}

async function failure(error: unknown): Promise<CartActionResult> {
  const t = await getTranslations("cart");
  if (isAppError(error)) {
    const d = (error.details ?? {}) as { cartFull?: boolean; max?: number };
    switch (error.code) {
      case "OUT_OF_STOCK":
        return { ok: false, message: d.max === 0 ? t("notAvailable") : t("noMoreStock") };
      case "NOT_FOUND":
        return { ok: false, message: t("notAvailable") };
      case "CONFLICT":
        return { ok: false, message: d.cartFull ? t("cartFull") : t("updateFailed") };
      case "RATE_LIMITED":
        return { ok: false, message: (await getTranslations("errors"))("rateLimited") };
      default:
        break;
    }
  } else {
    logger.error({ err: error }, "cart action failed");
  }
  return { ok: false, message: t("updateFailed") };
}

/** Product page "Add to cart". Re-renders the page so the cart badges update. */
export async function addToCartAction(
  variantId: string,
  quantity: number,
): Promise<CartActionResult> {
  if (
    !uuid.safeParse(variantId).success ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 99
  )
    return failure(null);
  try {
    await limitCartWrites();
    const cartId = await ensureRequestCartId();
    const result = await addCartItem(cartId, variantId, quantity);
    refresh();
    const t = await getTranslations("cart");
    return {
      ok: true,
      cartCount: await countCartItems(cartId),
      message: result.limited ? t("limited", { count: result.quantity }) : undefined,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function updateCartItemAction(
  itemId: string,
  quantity: number,
): Promise<CartActionResult> {
  if (!uuid.safeParse(itemId).success || !Number.isInteger(quantity)) return failure(null);
  try {
    await limitCartWrites();
    const cartId = await getRequestCartId();
    if (!cartId) return { ok: true, cartCount: 0 };
    const result = await updateCartItem(cartId, itemId, quantity);
    refresh();
    const t = await getTranslations("cart");
    return {
      ok: true,
      cartCount: await countCartItems(cartId),
      message: result.limited ? t("limited", { count: result.quantity }) : undefined,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function removeCartItemAction(itemId: string): Promise<CartActionResult> {
  if (!uuid.safeParse(itemId).success) return failure(null);
  try {
    await limitCartWrites();
    const cartId = await getRequestCartId();
    if (cartId) await removeCartItem(cartId, itemId);
    refresh();
    return { ok: true, cartCount: cartId ? await countCartItems(cartId) : 0 };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Apply a coupon code to the cart. Attempts are rate limited per IP so codes cannot be guessed
 * by brute force; the reason a code does not apply is shown in plain words.
 */
export async function applyCouponAction(_prev: FormState, form: FormData): Promise<FormState> {
  const t = await getTranslations("cart");
  const raw = field(form, "code", 60);
  const values = { code: raw };
  try {
    const ip = (await requestIp()) ?? "unknown";
    await enforceRateLimit(`coupon:ip:${ip}`, 10, 600);
    const code = normalizeCouponCode(raw);
    const cartId = await getRequestCartId();
    if (!cartId) return { ok: false, fieldErrors: { code: t("emptyTitle") }, values };
    if (!code) return { ok: false, fieldErrors: { code: t("coupon.issues.not_found") }, values };
    const [view, session, settings] = await Promise.all([
      getCartView(cartId),
      getSession(),
      getSettings(),
    ]);
    if (!view) return { ok: false, fieldErrors: { code: t("emptyTitle") }, values };
    const pricing = await priceCart({ ...view, couponCode: code }, { userId: session?.user.id });
    const issue = pricing.coupon?.issue;
    if (issue && issue !== "min_subtotal") {
      return { ok: false, fieldErrors: { code: t(`coupon.issues.${issue}`) }, values };
    }
    await setCartCoupon(cartId, pricing.coupon?.code ?? code);
    refresh();
    if (issue === "min_subtotal" && pricing.coupon?.terms) {
      // Kept on the cart: it applies automatically once the minimum is reached.
      const currency = {
        currency: settings.general.currency,
        decimals: settings.general.currencyDecimals,
      };
      return {
        ok: true,
        message: t("coupon.issues.min_subtotal", {
          amount: formatMoney(pricing.coupon.terms.minSubtotal ?? 0, currency, await getLocale()),
        }),
        data: { info: true },
      };
    }
    return { ok: true, message: t("coupon.applied", { code: pricing.coupon?.code ?? code }) };
  } catch (error) {
    if (isAppError(error) && error.code === "RATE_LIMITED")
      return { ok: false, message: (await getTranslations("errors"))("rateLimited"), values };
    logger.error({ err: error }, "apply coupon failed");
    return { ok: false, message: t("updateFailed"), values };
  }
}

export async function removeCouponAction(): Promise<CartActionResult> {
  try {
    const cartId = await getRequestCartId();
    if (cartId) await setCartCoupon(cartId, null);
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
