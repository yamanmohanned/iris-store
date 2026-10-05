"use server";

import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import type { FormState } from "@/lib/form-state";
import { redirect } from "@/i18n/navigation";
import { field, toFormState } from "@/server/action-errors";
import { authHeaders, requestIp } from "@/server/auth/session";
import { signInWithPassword } from "@/server/services/auth-flows";
import { completeSetup } from "@/server/services/setup";

export async function setupAction(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = await getLocale();
  const values = {
    storeNameAr: field(form, "storeNameAr", 80),
    storeNameEn: field(form, "storeNameEn", 80),
    country: field(form, "country", 2),
    ownerName: field(form, "ownerName", 80),
    email: field(form, "email", 254),
  };
  try {
    const ip = await requestIp();
    const password = field(form, "password", 200);
    await completeSetup({ ...values, token: field(form, "token", 200), password }, { ip });
    // Sign the owner in right away; the admin then requires enabling 2FA first.
    await signInWithPassword(
      { email: values.email, password, rememberMe: false },
      { headers: await authHeaders(locale), ip, userAgent: (await headers()).get("user-agent") },
    );
  } catch (error) {
    return toFormState(error, values);
  }
  redirect({ href: { pathname: "/account/security", query: { setup2fa: "1" } }, locale });
  return null;
}
