import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";

/**
 * Carries the email between "enter email" and "enter code" steps without putting it in the URL
 * (URLs end up in logs and browser history). Only UX state — every action re-validates.
 */
const NAME = "iris_pending_email";

export async function setPendingEmail(email: string) {
  (await cookies()).set(NAME, email, {
    httpOnly: true,
    sameSite: "lax",
    secure:
      process.env.NODE_ENV === "production" && (process.env.APP_URL ?? "").startsWith("https://"),
    path: "/",
    maxAge: 30 * 60,
  });
}

export async function getPendingEmail(): Promise<string | null> {
  const value = (await cookies()).get(NAME)?.value;
  const parsed = z.email().safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function clearPendingEmail() {
  (await cookies()).delete(NAME);
}
