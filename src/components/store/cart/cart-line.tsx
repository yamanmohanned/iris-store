"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Link } from "@/i18n/navigation";
import { tl } from "@/lib/localized";
import { formatMoney, type CurrencyConfig } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CartActionResult, CartLine as CartLineDTO } from "@/server/services/cart";
import { MediaImage } from "../media-image";

/** One cart line: photo, name, options, quantity stepper and remove — updates in place. */
export function CartLine({
  line,
  currency,
  locale,
  onUpdate,
  onRemove,
}: {
  line: CartLineDTO;
  currency: CurrencyConfig;
  locale: string;
  onUpdate: (itemId: string, quantity: number) => Promise<CartActionResult>;
  onRemove: (itemId: string) => Promise<CartActionResult>;
}) {
  const t = useTranslations("cart");
  const [pending, startTransition] = useTransition();
  const name = tl(line.name, locale);
  const label = tl(line.variantLabel, locale);

  function run(action: () => Promise<CartActionResult>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.message ?? t("updateFailed"));
      else if (result.message) toast.info(result.message);
    });
  }

  const unavailable = line.issue === "unavailable";
  return (
    <li
      className={cn("flex gap-3 p-3 transition-opacity sm:gap-4 sm:p-4", pending && "opacity-60")}
      aria-busy={pending}
    >
      <Link
        href={`/p/${line.slug}`}
        className="block w-20 shrink-0 sm:w-24"
        tabIndex={-1}
        aria-hidden="true"
      >
        <span className="block aspect-[4/5] overflow-hidden petal-sm bg-surface-muted">
          <MediaImage
            image={line.image}
            sizes="96px"
            alt=""
            locale={locale}
            className={cn("size-full", unavailable && "opacity-50 grayscale")}
          />
        </span>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Link
              href={`/p/${line.slug}`}
              className="line-clamp-2 text-sm leading-snug font-medium hover:text-primary"
            >
              {name}
            </Link>
            {label ? <p className="mt-0.5 text-xs text-muted-foreground">{label}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => run(() => onRemove(line.id))}
            disabled={pending}
            aria-label={t("removeItem", { name })}
            className="-me-1.5 -mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-[1.1rem]" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          {unavailable ? (
            <p className="text-xs font-medium text-danger">{t("unavailable")}</p>
          ) : (
            <div
              className="inline-flex h-10 items-center rounded-full border bg-surface"
              role="group"
              aria-label={t("quantityOf", { name })}
            >
              <button
                type="button"
                onClick={() =>
                  run(() =>
                    line.quantity <= 1 ? onRemove(line.id) : onUpdate(line.id, line.quantity - 1),
                  )
                }
                disabled={pending}
                aria-label={line.quantity <= 1 ? t("removeItem", { name }) : t("decrease")}
                className="inline-flex size-10 items-center justify-center rounded-full disabled:opacity-40"
              >
                {line.quantity <= 1 ? (
                  <Trash2 className="size-4" aria-hidden="true" />
                ) : (
                  <Minus className="size-4" aria-hidden="true" />
                )}
              </button>
              <output className="w-7 text-center text-sm font-semibold tabular" aria-live="polite">
                {pending ? <Spinner className="mx-auto size-3.5" /> : line.quantity}
              </output>
              <button
                type="button"
                onClick={() => run(() => onUpdate(line.id, line.quantity + 1))}
                disabled={pending || line.quantity >= line.maxQuantity}
                aria-label={t("increase")}
                className="inline-flex size-10 items-center justify-center rounded-full disabled:opacity-40"
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
            </div>
          )}
          <div className="text-end">
            <bdi className="block text-[0.95rem] font-semibold tabular">
              {formatMoney(line.lineTotal, currency, locale)}
            </bdi>
            {line.quantity > 1 ? (
              <span className="block text-[0.7rem] text-muted-foreground tabular">
                <bdi>{formatMoney(line.unitPrice, currency, locale)}</bdi> × {line.quantity}
              </span>
            ) : line.compareAtPrice ? (
              <del className="block text-[0.7rem] text-muted-foreground tabular">
                <bdi>{formatMoney(line.compareAtPrice, currency, locale)}</bdi>
              </del>
            ) : null}
          </div>
        </div>

        {line.issue === "insufficient_stock" ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="font-medium text-warning">
              {t("insufficientStock", { count: line.maxQuantity })}
            </span>
            <button
              type="button"
              onClick={() => run(() => onUpdate(line.id, line.maxQuantity))}
              disabled={pending}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              {t("useAvailable", { count: line.maxQuantity })}
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
