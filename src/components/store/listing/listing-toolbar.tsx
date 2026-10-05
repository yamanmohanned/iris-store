"use client";

import { ArrowDownUp, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { usePathname, useRouter } from "@/i18n/navigation";
import { activeFilterCount, type ListingParams, type ListingSort } from "@/lib/listing";
import { cn } from "@/lib/utils";

/**
 * Sticky sort + filter bar. Sorting uses the native picker (best on phones); filters open in a
 * bottom sheet and are applied in one go. Everything lives in the URL (shareable, back-button safe).
 */
export function ListingToolbar({
  params,
  total,
  sorts,
}: {
  params: ListingParams;
  total: number;
  sorts: ListingSort[];
}) {
  const t = useTranslations("store");
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(params.min?.toString() ?? "");
  const [max, setMax] = useState(params.max?.toString() ?? "");
  const [stock, setStock] = useState(params.stock === "1");
  const [sale, setSale] = useState(params.sale === "1");
  const count = activeFilterCount(params);

  function navigate(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    const qs = next.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return (
    <div className="sticky top-[calc(var(--header-height)+env(safe-area-inset-top))] z-30 -mx-4 border-b bg-background/95 px-4 py-2.5 backdrop-blur md:-mx-6 md:px-6 lg:top-16 lg:mx-0 lg:px-0">
      <div className="flex items-center gap-2">
        <p className="me-auto text-sm text-muted-foreground tabular" aria-live="polite">
          {pending ? <Spinner className="me-2 align-middle" /> : null}
          {t("productsCount", { count: total })}
        </p>

        <label className="relative inline-flex h-10 items-center gap-1.5 rounded-full border bg-surface ps-3 pe-2 text-sm font-medium">
          <ArrowDownUp className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">{t("sort.label")}</span>
          <select
            value={params.sort ?? sorts[0]}
            onChange={(e) => navigate({ sort: e.target.value })}
            className="h-full max-w-[9.5rem] cursor-pointer appearance-none bg-transparent pe-1 text-sm outline-none"
          >
            {sorts.map((s) => (
              <option key={s} value={s}>
                {t(`sort.${s}`)}
              </option>
            ))}
          </select>
        </label>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-10 rounded-full", count && "border-primary text-primary")}
            >
              <SlidersHorizontal />
              {count ? t("filters.active", { count }) : t("filters.title")}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" title={t("filters.title")} closeLabel={t("filters.apply")}>
            <form
              className="space-y-6 px-4 pt-2 pb-6"
              onSubmit={(e) => {
                e.preventDefault();
                setOpen(false);
                navigate({
                  min: min || undefined,
                  max: max || undefined,
                  stock: stock ? "1" : undefined,
                  sale: sale ? "1" : undefined,
                });
              }}
            >
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">{t("filters.price")}</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="f-min" className="text-xs text-muted-foreground">
                      {t("filters.minPrice")}
                    </Label>
                    <Input
                      id="f-min"
                      inputMode="decimal"
                      dir="ltr"
                      value={min}
                      onChange={(e) => setMin(e.target.value.replace(/[^\d.]/g, ""))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="f-max" className="text-xs text-muted-foreground">
                      {t("filters.maxPrice")}
                    </Label>
                    <Input
                      id="f-max"
                      inputMode="decimal"
                      dir="ltr"
                      value={max}
                      onChange={(e) => setMax(e.target.value.replace(/[^\d.]/g, ""))}
                    />
                  </div>
                </div>
              </fieldset>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{t("filters.inStock")}</span>
                <Switch checked={stock} onCheckedChange={setStock} />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{t("filters.onSale")}</span>
                <Switch checked={sale} onCheckedChange={setSale} />
              </label>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setMin("");
                    setMax("");
                    setStock(false);
                    setSale(false);
                    setOpen(false);
                    navigate({ min: undefined, max: undefined, stock: undefined, sale: undefined });
                  }}
                >
                  {t("filters.reset")}
                </Button>
                <Button type="submit" size="lg">
                  {t("filters.apply")}
                </Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
