import "server-only";
import { eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { tl } from "@/lib/localized";
import { emailBrand } from "@/server/auth/brand";
import { runInBackground } from "@/server/background";
import { db } from "@/server/db/client";
import {
  ORDER_STATUSES,
  orders,
  outboxMessages,
  productOptions,
  products,
  productVariants,
} from "@/server/db/schema";
import { sendEmail, type EmailMessage } from "@/server/email";
import {
  adminLowStockEmail,
  adminNewOrderEmail,
  orderPlacedEmail,
  orderStatusEmail,
} from "@/server/email/order-templates";
import type { EmailLocale } from "@/server/email/templates";
import { env } from "@/server/env";
import { logger } from "@/server/logger";
import { variantLabel } from "./cart";
import { getOrderById, orderLink } from "./orders";
import { getSettings } from "./settings";

/** After this many failed attempts a message is parked as "failed" (visible to the owner). */
export const OUTBOX_MAX_ATTEMPTS = 6;
/** Minutes before retry n (1-based): 2, 4, 8, 16, 32 … capped at 4 hours. */
export const retryDelayMinutes = (attempt: number) => Math.min(240, 2 ** attempt);

type Claimed = {
  id: string;
  channel: string;
  recipient: string;
  template: string;
  payload: Record<string, unknown>;
  attempts: number;
};

const orderPayload = z.object({ orderId: z.uuid() });
const statusPayload = z.object({ orderId: z.uuid(), status: z.enum(ORDER_STATUSES) });
const lowStockPayload = z.object({
  orderId: z.uuid().optional(),
  variants: z.array(z.object({ variantId: z.uuid(), stock: z.number().int() })).max(100),
});

class PermanentError extends Error {}

async function render(m: Claimed): Promise<EmailMessage | null> {
  const settings = await getSettings();
  const currency = {
    currency: settings.general.currency,
    decimals: settings.general.currencyDecimals,
  };
  switch (m.template) {
    case "order_placed": {
      const { orderId } = orderPayload.parse(m.payload);
      const [order, url] = await Promise.all([getOrderById(orderId), orderLink(orderId)]);
      if (!order || !url) return null; // order deleted meanwhile: nothing to send
      const locale: EmailLocale = order.locale === "en" ? "en" : "ar";
      const instructions = tl(settings.checkout.bankTransfer.instructions, locale);
      return orderPlacedEmail({
        to: m.recipient,
        locale,
        brand: await emailBrand(locale),
        order,
        currency,
        orderUrl: url,
        bankInstructions:
          order.paymentMethod === "bank_transfer" && instructions ? instructions : undefined,
      });
    }
    case "order_status": {
      const { orderId, status } = statusPayload.parse(m.payload);
      const [order, url] = await Promise.all([getOrderById(orderId), orderLink(orderId)]);
      if (!order || !url) return null;
      const locale: EmailLocale = order.locale === "en" ? "en" : "ar";
      const reason =
        status === "cancelled"
          ? ((
              await db
                .select({ reason: orders.cancelReason })
                .from(orders)
                .where(eq(orders.id, orderId))
                .limit(1)
            )[0]?.reason ?? null)
          : null;
      return orderStatusEmail({
        to: m.recipient,
        locale,
        brand: await emailBrand(locale),
        order,
        status,
        reason,
        orderUrl: url,
      });
    }
    case "admin_new_order": {
      const { orderId } = orderPayload.parse(m.payload);
      const order = await getOrderById(orderId);
      if (!order) return null;
      return adminNewOrderEmail({
        to: m.recipient,
        brand: await emailBrand("ar"),
        order,
        currency,
        adminUrl: `${env().APP_URL}/admin/orders/${order.orderNumber}`,
      });
    }
    case "admin_low_stock": {
      const { variants } = lowStockPayload.parse(m.payload);
      if (variants.length === 0) return null;
      const ids = variants.map((v) => v.variantId);
      const rows = await db
        .select({ variant: productVariants, name: products.name, productId: products.id })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(inArray(productVariants.id, ids));
      const options = await db
        .select()
        .from(productOptions)
        .where(inArray(productOptions.productId, [...new Set(rows.map((r) => r.productId))]));
      const items = rows.map((r) => {
        const opts = options
          .filter((o) => o.productId === r.productId)
          .sort((a, b) => a.position - b.position);
        const label = tl(variantLabel(opts, r.variant.optionValueIds), "ar");
        return {
          name: label ? `${tl(r.name, "ar")} (${label})` : tl(r.name, "ar"),
          stock: r.variant.stockQuantity,
        };
      });
      return adminLowStockEmail({
        to: m.recipient,
        brand: await emailBrand("ar"),
        items,
        adminUrl: `${env().APP_URL}/admin/products`,
      });
    }
    default:
      throw new PermanentError(`unknown template ${m.template}`);
  }
}

async function deliver(m: Claimed) {
  if (m.channel !== "email") throw new PermanentError(`channel ${m.channel} is not configured`);
  const message = await render(m);
  if (message) await sendEmail(message);
}

/**
 * Deliver due messages. Rows are claimed with SKIP LOCKED (several workers never send twice);
 * a row stuck in "sending" for 10 minutes (crashed worker) is picked up again.
 */
export async function processOutbox(limit = 20): Promise<{ sent: number; failed: number }> {
  const claimed = await db.execute<Claimed>(sql`
    update outbox_messages
    set status = 'sending', attempts = attempts + 1, next_attempt_at = now()
    where id in (
      select id from outbox_messages
      where (status = 'pending' and next_attempt_at <= now())
         or (status = 'sending' and next_attempt_at < now() - interval '10 minutes')
      order by next_attempt_at
      limit ${limit}
      for update skip locked
    )
    returning id, channel, recipient, template, payload, attempts
  `);
  let sent = 0;
  let failed = 0;
  for (const m of claimed.rows) {
    try {
      await deliver(m);
      await db
        .update(outboxMessages)
        .set({ status: "sent", sentAt: new Date(), lastError: null })
        .where(eq(outboxMessages.id, m.id));
      sent++;
    } catch (err) {
      failed++;
      const permanent = err instanceof PermanentError || err instanceof z.ZodError;
      const giveUp = permanent || m.attempts >= OUTBOX_MAX_ATTEMPTS;
      logger.warn(
        { err, template: m.template, attempts: m.attempts, giveUp },
        "outbox delivery failed",
      );
      await db
        .update(outboxMessages)
        .set({
          status: giveUp ? "failed" : "pending",
          lastError: String((err as Error)?.message ?? err).slice(0, 500),
          nextAttemptAt: new Date(Date.now() + retryDelayMinutes(m.attempts) * 60_000),
        })
        .where(eq(outboxMessages.id, m.id));
    }
  }
  return { sent, failed };
}

/** Send right after the response (order emails arrive within seconds); retries come from cron. */
export function kickOutbox() {
  runInBackground("outbox", () => processOutbox());
}
