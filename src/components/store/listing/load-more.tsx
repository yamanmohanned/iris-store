"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CurrencyConfig } from "@/lib/money";
import type { ProductCardDTO } from "@/server/services/catalog";
import { ProductCard } from "../product-card";

/** Appends the next pages of a listing (same filters) without a full navigation. */
export function LoadMore({
  query,
  initialCount,
  total,
  currency,
  locale,
}: {
  query: string;
  initialCount: number;
  total: number;
  currency: CurrencyConfig;
  locale: string;
}) {
  const t = useTranslations("store");
  const tErrors = useTranslations("errors");
  const [items, setItems] = useState<ProductCardDTO[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const shown = initialCount + items.length;

  async function load() {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/products?${query}${query ? "&" : ""}page=${page + 1}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { items: ProductCardDTO[] };
      setItems((prev) => [...prev, ...data.items]);
      setPage((p) => p + 1);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {items.map((p) => (
        <ProductCard key={p.id} product={p} currency={currency} locale={locale} headingLevel={2} />
      ))}
      {shown < total ? (
        <div className="col-span-full flex flex-col items-center gap-2 pt-4">
          <p className="text-xs text-muted-foreground tabular">
            {t("showingOf", { shown, total })}
          </p>
          <Button
            variant="outline"
            size="lg"
            className="min-w-48 rounded-full"
            loading={loading}
            onClick={load}
          >
            {t("loadMore")}
          </Button>
          {failed ? (
            <p role="alert" className="text-sm text-danger">
              {tErrors("network")}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
