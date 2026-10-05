import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { LocalizedText } from "@/lib/localized";
import type { CouponTerms } from "@/lib/pricing";
import { db, type DbExecutor } from "@/server/db/client";
import {
  cartItems,
  carts,
  media,
  productImages,
  productOptions,
  products,
  productVariants,
  type OptionValue,
} from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { toImageDTO, type ImageDTO } from "./media";

export const CART_TTL_DAYS = 60;
/** Per-line cap for retail orders (the database allows up to 999). */
export const MAX_LINE_QUANTITY = 99;
/** Distinct products per cart (abuse guard). */
export const MAX_CART_LINES = 50;

export type CartLineIssue = "unavailable" | "insufficient_stock";

export type CartLine = {
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  name: LocalizedText;
  /** "Size: M · Color: White" in each language; null for products without options. */
  variantLabel: LocalizedText | null;
  sku: string | null;
  image: ImageDTO | null;
  unitPrice: number;
  compareAtPrice: number | null;
  quantity: number;
  /** Most this line can be set to right now (0 when unavailable). */
  maxQuantity: number;
  issue: CartLineIssue | null;
  lineTotal: number;
};

export type CartView = {
  id: string;
  lines: CartLine[];
  /** Units across lines that can be bought now. */
  itemCount: number;
  couponCode: string | null;
  updatedAt: string;
};

/** Result of a cart Server Action, shown to the customer as a toast. */
export type CartActionResult = { ok: boolean; message?: string; cartCount?: number };

export const hashCartToken = (token: string) =>
  createHash("sha256").update(token).digest("base64url");
export const newCartToken = () => randomBytes(32).toString("base64url");

const expiry = () => new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000);

/** Variant description built from the product's options, e.g. { ar: "المقاس: M · اللون: أبيض" }. */
export function variantLabel(
  options: { name: LocalizedText; values: OptionValue[] }[],
  optionValueIds: string[],
): LocalizedText | null {
  if (options.length === 0) return null;
  const parts = options
    .map((o, i) => ({ name: o.name, value: o.values.find((v) => v.id === optionValueIds[i]) }))
    .filter((p): p is { name: LocalizedText; value: OptionValue } => Boolean(p.value));
  if (parts.length === 0) return null;
  const render = (l: "ar" | "en") =>
    parts
      .map(
        (p) =>
          `${p.name[l] || p.name.ar || p.name.en || ""}: ${p.value.label[l] || p.value.label.ar || p.value.label.en || ""}`,
      )
      .join(" · ");
  return { ar: render("ar"), en: render("en") };
}

/** Smallest rendition at least `minWidth` wide (thumbnails in emails and order snapshots). */
export function imageUrlAtLeast(image: ImageDTO | null, minWidth = 320): string | null {
  if (!image) return null;
  const candidates = image.srcSet
    .split(",")
    .map((s) => s.trim().split(/\s+/))
    .map(([url, w]) => ({ url: url!, width: Number.parseInt(w ?? "0", 10) }))
    .filter((c) => c.url);
  return candidates.find((c) => c.width >= minWidth)?.url ?? image.src ?? null;
}

// ── Lookup & lifecycle ───────────────────────────────────────────────────────

/** A guest cart by its cookie token (only carts not yet claimed by an account). */
export async function findGuestCartId(token: string): Promise<string | null> {
  if (!token || token.length > 128) return null;
  const [row] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(
      and(
        eq(carts.tokenHash, hashCartToken(token)),
        isNull(carts.userId),
        sql`${carts.expiresAt} > now()`,
      ),
    )
    .limit(1);
  return row?.id ?? null;
}

export async function findUserCartId(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);
  return row?.id ?? null;
}

export async function createGuestCart(): Promise<{ id: string; token: string }> {
  const token = newCartToken();
  const [row] = await db
    .insert(carts)
    .values({ tokenHash: hashCartToken(token), expiresAt: expiry() })
    .returning({ id: carts.id });
  return { id: row!.id, token };
}

export async function getOrCreateUserCart(userId: string): Promise<string> {
  const existing = await findUserCartId(userId);
  if (existing) return existing;
  const [row] = await db
    .insert(carts)
    .values({ userId, tokenHash: hashCartToken(newCartToken()), expiresAt: expiry() })
    .onConflictDoNothing()
    .returning({ id: carts.id });
  return row?.id ?? (await findUserCartId(userId))!;
}

/**
 * Move a guest cart into the customer's account after sign-in: claimed as-is when the account has
 * no cart, otherwise merged line by line (quantities added) and deleted. Idempotent and safe when
 * two requests race (the guest row is locked; a merged cart no longer matches `user_id is null`).
 * The claimed cart gets a fresh token hash, so the old cookie can never reach it after sign-out.
 */
export async function mergeGuestCart(guestCartId: string, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [guest] = await tx
      .select({ id: carts.id, couponCode: carts.couponCode })
      .from(carts)
      .where(and(eq(carts.id, guestCartId), isNull(carts.userId)))
      .for("update");
    if (!guest) return;
    const [own] = await tx
      .select({ id: carts.id, couponCode: carts.couponCode })
      .from(carts)
      .where(eq(carts.userId, userId))
      .for("update");
    if (!own) {
      await tx
        .update(carts)
        .set({ userId, tokenHash: hashCartToken(newCartToken()), expiresAt: expiry() })
        .where(eq(carts.id, guest.id));
      return;
    }
    await tx.execute(sql`
      insert into cart_items (cart_id, variant_id, quantity)
      select ${own.id}, variant_id, quantity from cart_items where cart_id = ${guest.id}
      on conflict (cart_id, variant_id) do update
        set quantity = least(${MAX_LINE_QUANTITY}, cart_items.quantity + excluded.quantity),
            updated_at = now()
    `);
    await tx
      .update(carts)
      .set({ couponCode: own.couponCode ?? guest.couponCode, expiresAt: expiry() })
      .where(eq(carts.id, own.id));
    await tx.delete(carts).where(eq(carts.id, guest.id));
  });
}

export async function deleteExpiredCarts(): Promise<number> {
  const deleted = await db
    .delete(carts)
    .where(sql`${carts.expiresAt} < now()`)
    .returning({ id: carts.id });
  return deleted.length;
}

// ── Reading ──────────────────────────────────────────────────────────────────

/** Quantity of units in the cart (badge in the header / tab bar). */
export async function countCartItems(cartId: string): Promise<number> {
  const result = await db.execute<{ n: number }>(
    sql`select coalesce(sum(quantity), 0)::int as n from cart_items where cart_id = ${cartId}`,
  );
  return result.rows[0]?.n ?? 0;
}

type LineRow = {
  itemId: string;
  quantity: number;
  variant: typeof productVariants.$inferSelect;
  product: Pick<typeof products.$inferSelect, "id" | "slug" | "name" | "status">;
};

/** Cart lines with live prices, stock and availability (prices are never taken from the cart). */
export async function loadCartLines(
  cartId: string,
  executor: DbExecutor = db,
): Promise<CartLine[]> {
  const rows: LineRow[] = await executor
    .select({
      itemId: cartItems.id,
      quantity: cartItems.quantity,
      variant: productVariants,
      product: {
        id: products.id,
        slug: products.slug,
        name: products.name,
        status: products.status,
      },
    })
    .from(cartItems)
    .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(asc(cartItems.createdAt), asc(cartItems.id));
  if (rows.length === 0) return [];

  const productIds = [...new Set(rows.map((r) => r.product.id))];
  const variantImageIds = rows.map((r) => r.variant.imageId).filter((v): v is string => Boolean(v));
  const [options, firstImages, variantImages] = await Promise.all([
    executor
      .select()
      .from(productOptions)
      .where(inArray(productOptions.productId, productIds))
      .orderBy(asc(productOptions.position)),
    executor
      .selectDistinctOn([productImages.productId], { productId: productImages.productId, m: media })
      .from(productImages)
      .innerJoin(media, eq(media.id, productImages.mediaId))
      .where(inArray(productImages.productId, productIds))
      .orderBy(productImages.productId, asc(productImages.position)),
    variantImageIds.length
      ? executor.select().from(media).where(inArray(media.id, variantImageIds))
      : Promise.resolve([]),
  ]);
  const optionsBy = new Map<string, (typeof options)[number][]>();
  for (const o of options) optionsBy.set(o.productId, [...(optionsBy.get(o.productId) ?? []), o]);
  const firstImageBy = new Map(firstImages.map((r) => [r.productId, toImageDTO(r.m)]));
  const mediaById = new Map(variantImages.map((m) => [m.id, toImageDTO(m)]));

  return rows.map(({ itemId, quantity, variant: v, product: p }) => {
    const purchasable = p.status === "active" && v.isActive;
    const stockCap = v.trackInventory ? v.stockQuantity : MAX_LINE_QUANTITY;
    const maxQuantity = purchasable ? Math.max(0, Math.min(MAX_LINE_QUANTITY, stockCap)) : 0;
    const issue: CartLineIssue | null =
      maxQuantity === 0 ? "unavailable" : quantity > maxQuantity ? "insufficient_stock" : null;
    return {
      id: itemId,
      variantId: v.id,
      productId: p.id,
      slug: p.slug,
      name: p.name,
      variantLabel: variantLabel(optionsBy.get(p.id) ?? [], v.optionValueIds),
      sku: v.sku,
      image: (v.imageId ? mediaById.get(v.imageId) : undefined) ?? firstImageBy.get(p.id) ?? null,
      unitPrice: v.price,
      compareAtPrice: v.compareAtPrice && v.compareAtPrice > v.price ? v.compareAtPrice : null,
      quantity,
      maxQuantity,
      issue,
      lineTotal: v.price * quantity,
    };
  });
}

export async function getCartView(cartId: string): Promise<CartView | null> {
  const [cart] = await db
    .select({ id: carts.id, couponCode: carts.couponCode, updatedAt: carts.updatedAt })
    .from(carts)
    .where(eq(carts.id, cartId))
    .limit(1);
  if (!cart) return null;
  const lines = await loadCartLines(cartId);
  return {
    id: cart.id,
    lines,
    itemCount: lines.filter((l) => !l.issue).reduce((n, l) => n + l.quantity, 0),
    couponCode: cart.couponCode,
    updatedAt: cart.updatedAt.toISOString(),
  };
}

/** Lines that can be ordered as they are (the checkout refuses carts with issues). */
export const purchasableLines = (view: CartView) => view.lines.filter((l) => !l.issue);

// ── Writing ──────────────────────────────────────────────────────────────────

async function touch(cartId: string, executor: DbExecutor = db) {
  await executor.update(carts).set({ expiresAt: expiry() }).where(eq(carts.id, cartId));
}

async function variantForSale(variantId: string) {
  const [row] = await db
    .select({ variant: productVariants, status: products.status })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(productVariants.id, variantId))
    .limit(1);
  if (!row || row.status !== "active" || !row.variant.isActive)
    throw new AppError("NOT_FOUND", "variant not for sale");
  const cap = row.variant.trackInventory ? row.variant.stockQuantity : MAX_LINE_QUANTITY;
  return { variant: row.variant, max: Math.min(MAX_LINE_QUANTITY, Math.max(0, cap)) };
}

/**
 * Add units of a variant. The resulting quantity is capped by stock; when nothing more can be
 * added, OUT_OF_STOCK is thrown (with the quantity already in the cart).
 */
export async function addCartItem(cartId: string, variantId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY)
    throw new AppError("VALIDATION", "bad quantity", { field: "quantity" });
  const { max } = await variantForSale(variantId);
  const [existing] = await db
    .select({ id: cartItems.id, quantity: cartItems.quantity })
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)))
    .limit(1);
  const current = existing?.quantity ?? 0;
  const next = Math.min(max, current + quantity);
  if (next <= current)
    throw new AppError("OUT_OF_STOCK", "no more stock", { inCart: current, max });
  if (!existing) {
    const lines = await db.$count(cartItems, eq(cartItems.cartId, cartId));
    if (lines >= MAX_CART_LINES) throw new AppError("CONFLICT", "cart is full", { cartFull: true });
  }
  await db
    .insert(cartItems)
    .values({ cartId, variantId, quantity: next })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.variantId],
      set: { quantity: next, updatedAt: sql`now()` },
    });
  await touch(cartId);
  return { quantity: next, limited: next < current + quantity };
}

/** Set a line's quantity (0 removes it); clamped to what is available. Lines of other carts are ignored. */
export async function updateCartItem(cartId: string, itemId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 999)
    throw new AppError("VALIDATION", "bad quantity", { field: "quantity" });
  const [item] = await db
    .select({ variantId: cartItems.variantId })
    .from(cartItems)
    .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
    .limit(1);
  if (!item) throw new AppError("NOT_FOUND", "cart item");
  if (quantity === 0) return removeCartItem(cartId, itemId);
  let max = 0;
  try {
    max = (await variantForSale(item.variantId)).max;
  } catch {
    max = 0;
  }
  if (max === 0) throw new AppError("OUT_OF_STOCK", "unavailable", { max: 0 });
  const next = Math.min(quantity, max);
  await db
    .update(cartItems)
    .set({ quantity: next, updatedAt: sql`now()` })
    .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
  await touch(cartId);
  return { quantity: next, limited: next < quantity };
}

export async function removeCartItem(cartId: string, itemId: string) {
  await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
  await touch(cartId);
  return { quantity: 0, limited: false };
}

export async function setCartCoupon(cartId: string, code: string | null) {
  await db.update(carts).set({ couponCode: code }).where(eq(carts.id, cartId));
}

/** After an order: empty the cart (keeps the row so a signed-in customer's cart id is stable). */
export async function clearCart(cartId: string, executor: DbExecutor = db) {
  await executor.delete(cartItems).where(eq(cartItems.cartId, cartId));
  await executor.update(carts).set({ couponCode: null }).where(eq(carts.id, cartId));
}

export type { CouponTerms };
