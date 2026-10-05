"use server";

import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { FormState } from "@/lib/form-state";
import { toLatinDigits } from "@/lib/phone";
import { field, toFormState } from "@/server/action-errors";
import { requestIp } from "@/server/auth/session";
import { enforceRateLimit } from "@/server/security/rate-limit";
import { findOrderTokenForTracking } from "@/server/services/orders";

/**
 * Order number + phone → the private order page. Limited per IP and per order number, so neither
 * order numbers nor phone numbers can be enumerated; a miss never says which part was wrong.
 */
export async function trackOrderAction(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = await getLocale();
  const values = { orderNumber: field(form, "orderNumber", 20), phone: field(form, "phone", 30) };
  let token: string | null;
  try {
    const t = await getTranslations("track");
    const number = Number.parseInt(toLatinDigits(values.orderNumber).replace(/[^\d]/g, ""), 10);
    await enforceRateLimit(`track:ip:${(await requestIp()) ?? "unknown"}`, 10, 900);
    if (Number.isSafeInteger(number)) await enforceRateLimit(`track:order:${number}`, 8, 3600);
    token = Number.isSafeInteger(number)
      ? await findOrderTokenForTracking(number, values.phone)
      : null;
    if (!token) return { ok: false, message: t("notFound"), values };
  } catch (error) {
    return toFormState(error, values);
  }
  redirect({ href: `/order/${token}`, locale });
  return null;
}
