"use client";

import { useState, type ReactNode } from "react";
import type { CurrencyConfig } from "@/lib/money";
import type { ProductDetailDTO } from "@/server/services/catalog";
import { ProductGallery } from "./gallery";
import { PurchasePanel, type AddToCart } from "./purchase-panel";

/** Gallery + purchase panel sharing the selected variant (its photo is brought into view). */
export function ProductExperience({
  product,
  name,
  currency,
  locale,
  header,
  extra,
  onAddToCart,
}: {
  product: ProductDetailDTO;
  name: string;
  currency: CurrencyConfig;
  locale: string;
  header: ReactNode;
  extra?: ReactNode;
  onAddToCart?: AddToCart;
}) {
  const [focusImageId, setFocusImageId] = useState<string | null>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
      <div className="-mx-4 md:mx-0 lg:sticky lg:top-24 lg:self-start">
        <div className="px-4 md:px-0">
          <ProductGallery
            images={product.images}
            name={name}
            locale={locale}
            focusImageId={focusImageId}
          />
        </div>
      </div>
      <div className="min-w-0 space-y-5">
        {header}
        <PurchasePanel
          product={product}
          currency={currency}
          locale={locale}
          onAddToCart={onAddToCart}
          onVariantImage={setFocusImageId}
          extra={extra}
        />
      </div>
    </div>
  );
}
