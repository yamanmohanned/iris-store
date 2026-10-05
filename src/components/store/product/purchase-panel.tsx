"use client";

import { Banknote, Check, Minus, Plus, RefreshCcw, ShoppingBag, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { tl } from "@/lib/localized";
import { discountPercent, formatMoney, type CurrencyConfig } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CartActionResult } from "@/server/services/cart";
import type { ProductDetailDTO, VariantDTO } from "@/server/services/catalog";

export type AddToCart = (variantId: string, quantity: number) => Promise<CartActionResult>;

/** Which values of option `index` can still lead to an available variant, given other choices. */
function availableValues(
  variants: VariantDTO[],
  selection: (string | null)[],
  index: number,
): Set<string> {
  const result = new Set<string>();
  for (const v of variants) {
    if (!v.available) continue;
    const matchesOthers = selection.every(
      (sel, i) => i === index || sel === null || v.optionValueIds[i] === sel,
    );
    if (matchesOthers) result.add(v.optionValueIds[index]!);
  }
  return result;
}

export function PurchasePanel({
  product,
  currency,
  locale,
  onAddToCart,
  onVariantImage,
  extra,
}: {
  product: ProductDetailDTO;
  currency: CurrencyConfig;
  locale: string;
  onAddToCart?: AddToCart;
  onVariantImage?: (imageId: string | null) => void;
  extra?: ReactNode;
}) {
  const t = useTranslations("store.product");
  const tStore = useTranslations("store");
  const tCart = useTranslations("cart");
  const router = useRouter();
  // Options with a single value are chosen automatically; others need an explicit choice.
  const [selection, setSelection] = useState<(string | null)[]>(() =>
    product.options.map((o) => (o.values.length === 1 ? o.values[0]!.id : null)),
  );
  const [quantity, setQuantity] = useState(1);
  const [pending, startTransition] = useTransition();
  const [missing, setMissing] = useState<number | null>(null);
  const [added, setAdded] = useState(false);

  const variant = useMemo(() => {
    if (product.options.length === 0) return product.variants[0] ?? null;
    if (selection.some((s) => s === null)) return null;
    return (
      product.variants.find((v) => v.optionValueIds.every((id, i) => id === selection[i])) ?? null
    );
  }, [product, selection]);

  const price = variant?.price ?? product.minPrice;
  const compareAt = variant?.compareAtPrice ?? null;
  const pct = discountPercent(price, compareAt);
  const complete = product.options.length === 0 || selection.every(Boolean);
  const available = variant ? variant.available : complete ? false : product.inStock;
  const maxQty = variant?.lowStock ?? 20;

  function choose(optionIndex: number, valueId: string) {
    const next = [...selection];
    next[optionIndex] = next[optionIndex] === valueId ? null : valueId;
    setSelection(next);
    setMissing(null);
    setQuantity(1);
    const match = product.variants.find((v) => v.optionValueIds.every((id, i) => id === next[i]));
    if (match?.imageId) onVariantImage?.(match.imageId);
  }

  function add() {
    if (!complete) {
      const index = selection.findIndex((s) => s === null);
      setMissing(index);
      document
        .getElementById(`option-${index}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!variant || !variant.available || !onAddToCart) return;
    startTransition(async () => {
      const result = await onAddToCart(variant.id, quantity);
      if (result.ok) {
        setAdded(true);
        toast.success(result.message ?? t("added"), {
          action: { label: tCart("viewCart"), onClick: () => router.push("/cart") },
        });
        window.setTimeout(() => setAdded(false), 2000);
      } else if (result.message) {
        toast.error(result.message);
      }
    });
  }

  const priceBlock = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <bdi className="text-2xl font-bold text-foreground tabular">
        {!complete && product.maxPrice > product.minPrice ? (
          <span className="me-1 text-sm font-normal text-muted-foreground">{tStore("from")}</span>
        ) : null}
        {formatMoney(price, currency, locale)}
      </bdi>
      {compareAt ? (
        <del className="text-sm text-muted-foreground tabular">
          <bdi>{formatMoney(compareAt, currency, locale)}</bdi>
        </del>
      ) : null}
      {pct ? (
        <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
          <bdi dir="ltr">{tStore("off", { percent: pct })}</bdi>
        </span>
      ) : null}
    </div>
  );

  const stockLine = !complete ? null : available ? (
    variant?.lowStock ? (
      <p className="flex items-center gap-2 text-sm font-medium text-warning">
        <span className="size-2 rounded-full bg-warning" aria-hidden="true" />
        {t("lowStock", { count: variant.lowStock })}
      </p>
    ) : (
      <p className="flex items-center gap-2 text-sm font-medium text-success">
        <span className="size-2 rounded-full bg-success" aria-hidden="true" />
        {t("inStock")}
      </p>
    )
  ) : (
    <p className="flex items-center gap-2 text-sm font-medium text-danger">
      <span className="size-2 rounded-full bg-danger" aria-hidden="true" />
      {variant ? t("outOfStock") : t("unavailableCombination")}
    </p>
  );

  const buttonLabel = added
    ? t("added")
    : !complete
      ? t("chooseOption", {
          option: tl(product.options[selection.findIndex((s) => s === null)]?.name, locale),
        })
      : t("addToCart");
  const canBuy = complete ? available : true;

  return (
    <div className="space-y-5">
      {priceBlock}
      {stockLine}

      {product.options.map((option, oi) => {
        const enabled = availableValues(product.variants, selection, oi);
        const isColor = option.values.some((v) => v.color);
        const chosen = option.values.find((v) => v.id === selection[oi]);
        return (
          <fieldset key={option.id} id={`option-${oi}`} className="scroll-mt-32">
            <legend className={cn("mb-2.5 text-sm font-semibold", missing === oi && "text-danger")}>
              {tl(option.name, locale)}
              {chosen ? (
                <span className="ms-2 font-normal text-muted-foreground">
                  {tl(chosen.label, locale)}
                </span>
              ) : null}
            </legend>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label={tl(option.name, locale)}
            >
              {option.values.map((value) => {
                const selected = selection[oi] === value.id;
                const disabled = !enabled.has(value.id);
                const label = tl(value.label, locale);
                return isColor ? (
                  <button
                    key={value.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={label}
                    title={label}
                    onClick={() => choose(oi, value.id)}
                    className={cn(
                      "relative size-11 rounded-full border-2 p-0.5 transition",
                      selected ? "border-primary" : "border-transparent hover:border-border",
                      disabled && "opacity-40",
                    )}
                  >
                    <span
                      className="block size-full rounded-full ring-1 ring-black/10"
                      style={{ background: value.color }}
                    />
                    {disabled ? (
                      <span
                        className="absolute inset-x-1 top-1/2 h-0.5 -rotate-45 bg-muted-foreground"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                ) : (
                  <button
                    key={value.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => choose(oi, value.id)}
                    className={cn(
                      "min-w-12 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-surface hover:border-primary",
                      disabled &&
                        !selected &&
                        "border-dashed text-muted-foreground line-through decoration-1",
                      missing === oi && !selected && "border-danger/60",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{t("quantity")}</span>
        <div className="inline-flex h-11 items-center rounded-full border bg-surface">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label={t("decrease")}
            className="inline-flex size-11 items-center justify-center disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>
          <output className="w-8 text-center font-semibold tabular" aria-live="polite">
            {quantity}
          </output>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={quantity >= maxQty}
            aria-label={t("increase")}
            className="inline-flex size-11 items-center justify-center disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <Button
        size="xl"
        block
        className="hidden lg:inline-flex"
        onClick={add}
        loading={pending}
        disabled={!canBuy || !onAddToCart}
      >
        {added ? <Check /> : <ShoppingBag />}
        {canBuy ? buttonLabel : t("outOfStock")}
      </Button>

      <ul className="grid gap-2.5 rounded-2xl bg-surface-muted p-4 text-sm">
        <li className="flex items-center gap-2.5">
          <Truck className="size-4 text-primary" aria-hidden="true" />
          {t("delivery")}
        </li>
        <li className="flex items-center gap-2.5">
          <Banknote className="size-4 text-primary" aria-hidden="true" />
          {t("cod")}
        </li>
        <li className="flex items-center gap-2.5">
          <RefreshCcw className="size-4 text-primary" aria-hidden="true" />
          {t("returns")}
        </li>
      </ul>
      {extra}

      {/* Phones: purchase bar pinned above the home indicator (replaces the tab bar here). */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0">
            <bdi className="block text-lg leading-tight font-bold tabular">
              {formatMoney(price, currency, locale)}
            </bdi>
            {compareAt ? (
              <del className="text-xs text-muted-foreground tabular">
                <bdi>{formatMoney(compareAt, currency, locale)}</bdi>
              </del>
            ) : null}
          </div>
          <Button
            size="lg"
            className="flex-1"
            onClick={add}
            loading={pending}
            disabled={!canBuy || !onAddToCart}
          >
            {added ? <Check /> : <ShoppingBag />}
            {canBuy ? buttonLabel : t("outOfStock")}
          </Button>
        </div>
      </div>
    </div>
  );
}
