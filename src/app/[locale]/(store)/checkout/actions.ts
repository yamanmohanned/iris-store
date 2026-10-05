"use server";

import { revalidatePath, refresh } from "next/cache";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { FormState } from "@/lib/form-state";
import { formatMoney } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";
import { field, toFormState } from "@/server/action-errors";
import { getSession, requestIp } from "@/server/auth/session";
import { getRequestCartId } from "@/server/cart-session";
import { isAppError } from "@/server/errors";
import { enforceRateLimit, hashKey } from "@/server/security/rate-limit";
import { assertHuman } from "@/server/security/turnstile";
import { setCartCoupon } from "@/server/services/cart";
import { placeOrder, type PlacedOrder } from "@/server/services/orders";
import { kickOutbox } from "@/server/services/outbox";
import { getSettings } from "@/server/services/settings";

const TEXT_FIELDS = {
  fullName: 80,
  phone: 30,
  email: 254,
  zoneId: 40,
  city: 80,
  area: 120,
  street: 200,
  landmark: 200,
  paymentMethod: 20,
  note: 500,
} as const;

/**
 * Place the order. Abuse controls: per-IP and per-phone limits (fake cash-on-delivery orders are
 * the classic attack on COD stores) and a bot check for guests when Turnstile is configured.
 */
export async function placeOrderAction(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = await getLocale();
  const values = Object.fromEntries(
    Object.entries(TEXT_FIELDS).map(([name, max]) => [name, field(form, name, max)]),
  ) as Record<keyof typeof TEXT_FIELDS, string>;
  let placed: PlacedOrder;
  let cartId: string | null = null;
  try {
    const [session, ip, h, settings] = await Promise.all([
      getSession(),
      requestIp(),
      headers(),
      getSettings(),
    ]);
    await enforceRateLimit(`order:ip:${ip ?? "unknown"}`, 10, 600);
    const phone = normalizePhone(values.phone, settings.general.phoneCode);
    if (phone) await enforceRateLimit(`order:phone:${hashKey(phone)}`, 5, 3600);
    if (!session) await assertHuman(field(form, "cf-turnstile-response", 2048), ip);
    cartId = await getRequestCartId();
    if (!cartId) {
      const t = await getTranslations("checkout");
      return { ok: false, message: t("errors.emptyCart"), data: { goToCart: true }, values };
    }
    placed = await placeOrder(
      {
        ...values,
        paymentMethod: values.paymentMethod as "cod" | "bank_transfer",
        saveAddress: form.get("saveAddress") === "on",
        idempotencyKey: field(form, "idempotencyKey", 64),
        expectedTotal: Number.parseInt(field(form, "expectedTotal", 20), 10),
      },
      {
        cartId,
        userId: session?.user.id ?? null,
        locale,
        ip,
        userAgent: h.get("user-agent"),
      },
    );
  } catch (error) {
    return checkoutError(error, values, cartId);
  }
  kickOutbox();
  // The cart badge and any cached page showing stock must reflect the new order.
  revalidatePath("/", "layout");
  redirect({ href: { pathname: `/order/${placed.accessToken}`, query: { placed: "1" } }, locale });
  return null;
}

async function checkoutError(
  error: unknown,
  values: Record<string, string>,
  cartId: string | null,
): Promise<FormState> {
  const t = await getTranslations("checkout");
  if (!isAppError(error)) return toFormState(error, values);
  const d = (error.details ?? {}) as {
    field?: string;
    minOrder?: number;
    total?: number;
    issue?: string;
    code?: string;
    emptyCart?: boolean;
    captcha?: boolean;
  };
  const settings = await getSettings();
  const money = async (n: number) =>
    formatMoney(
      n,
      { currency: settings.general.currency, decimals: settings.general.currencyDecimals },
      await getLocale(),
    );
  switch (error.code) {
    case "VALIDATION":
      if (d.minOrder != null)
        return {
          ok: false,
          message: t("errors.minimumOrder", { amount: await money(d.minOrder) }),
          values,
        };
      if (d.field === "phone")
        return { ok: false, fieldErrors: { phone: t("errors.phone") }, values };
      if (d.field === "zoneId")
        return { ok: false, fieldErrors: { zoneId: t("errors.zone") }, values };
      if (d.field === "paymentMethod")
        return {
          ok: false,
          message: t("errors.codUnavailable"),
          fieldErrors: { paymentMethod: t("errors.codUnavailable") },
          values,
        };
      return toFormState(error, values);
    case "OUT_OF_STOCK":
      refresh();
      return { ok: false, message: t("errors.cartChanged"), data: { goToCart: true }, values };
    case "BAD_REQUEST":
      if (d.emptyCart)
        return { ok: false, message: t("errors.emptyCart"), data: { goToCart: true }, values };
      return toFormState(error, values);
    case "CONFLICT":
      refresh();
      return {
        ok: false,
        message: t("errors.priceChanged", { total: await money(d.total ?? 0) }),
        values,
      };
    case "INVALID_COUPON": {
      if (cartId) await setCartCoupon(cartId, null);
      refresh();
      const tCart = await getTranslations("cart");
      const reason = tCart(`coupon.issues.${d.issue ?? "not_found"}` as "coupon.issues.not_found", {
        amount: "",
      });
      return {
        ok: false,
        message: t("errors.couponInvalid", { code: d.code ?? "", reason }),
        values,
      };
    }
    case "UNAUTHORIZED":
      return { ok: false, message: t("errors.signInRequired"), values };
    default:
      return toFormState(error, values);
  }
}
