import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getSession } from "@/server/auth/session";
import { env } from "@/server/env";
import { logger } from "@/server/logger";
import {
  CART_TTL_DAYS,
  countCartItems,
  createGuestCart,
  findGuestCartId,
  findUserCartId,
  getOrCreateUserCart,
  mergeGuestCart,
} from "@/server/services/cart";

/**
 * Which cart belongs to this request. Guests are identified by a random token in an httpOnly
 * cookie (only its hash is stored); signed-in customers by their account, and a guest cart left
 * in the browser is merged into the account automatically after sign-in.
 */
export function cartCookieName() {
  // __Host- cookies are bound to this exact origin (no Domain, Secure, Path=/) — not settable on http.
  return env().APP_URL.startsWith("https://") ? "__Host-iris_cart" : "iris_cart";
}

async function readToken(): Promise<string | null> {
  return (await cookies()).get(cartCookieName())?.value ?? null;
}

/** The current cart id, without creating one (safe in Server Components). Deduplicated per request. */
export const getRequestCartId = cache(async (): Promise<string | null> => {
  const [session, token] = await Promise.all([getSession(), readToken()]);
  const guestId = token ? await findGuestCartId(token) : null;
  if (!session) return guestId;
  if (guestId) {
    try {
      await mergeGuestCart(guestId, session.user.id);
    } catch (err) {
      // Never break page rendering over a cart merge; it is retried on the next request.
      logger.warn({ err }, "guest cart merge failed");
    }
  }
  return findUserCartId(session.user.id);
});

/** Units in the current cart for the header/tab-bar badge. */
export async function getRequestCartCount(): Promise<number> {
  const id = await getRequestCartId();
  return id ? countCartItems(id) : 0;
}

/** For Server Actions: the current cart, created on first use (sets the guest cookie). */
export async function ensureRequestCartId(): Promise<string> {
  const existing = await getRequestCartId();
  if (existing) return existing;
  const session = await getSession();
  if (session) return getOrCreateUserCart(session.user.id);
  const { id, token } = await createGuestCart();
  (await cookies()).set(cartCookieName(), token, {
    httpOnly: true,
    secure: env().APP_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: CART_TTL_DAYS * 24 * 60 * 60,
  });
  return id;
}
