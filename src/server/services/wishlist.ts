import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { products, wishlistItems } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { listProducts, type ProductCardDTO } from "./catalog";

/** Matches the largest product page size, so the whole list shows on one page. */
export const MAX_WISHLIST = 96;

export async function isInWishlist(userId: string, productId: string): Promise<boolean> {
  const [row] = await db
    .select({ productId: wishlistItems.productId })
    .from(wishlistItems)
    .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)))
    .limit(1);
  return Boolean(row);
}

/** Add or remove a product; returns whether it is now saved. Only live products can be added. */
export async function toggleWishlist(userId: string, productId: string): Promise<boolean> {
  const removed = await db
    .delete(wishlistItems)
    .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)))
    .returning({ productId: wishlistItems.productId });
  if (removed.length) return false;

  const [product] = await db
    .select({ status: products.status })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (product?.status !== "active") throw new AppError("NOT_FOUND", "product");
  const [{ n }] = (await db
    .select({ n: count() })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId))) as [{ n: number }];
  if (n >= MAX_WISHLIST) throw new AppError("CONFLICT", "wishlist full", { limit: true });
  await db.insert(wishlistItems).values({ userId, productId }).onConflictDoNothing();
  return true;
}

/** Saved products that are still on sale, most recently saved first. */
export async function listWishlist(userId: string): Promise<ProductCardDTO[]> {
  const rows = await db
    .select({ productId: wishlistItems.productId })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId))
    .orderBy(desc(wishlistItems.createdAt))
    .limit(MAX_WISHLIST);
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.productId);
  const { items } = await listProducts({ ids, pageSize: MAX_WISHLIST });
  const order = new Map(ids.map((id, i) => [id, i]));
  return items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
