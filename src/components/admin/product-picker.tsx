"use client";

import { ArrowDown, ArrowUp, Plus, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { tl, type LocalizedText } from "@/lib/localized";
import { formatMoney, type CurrencyConfig } from "@/lib/money";
import type { ImageDTO } from "@/server/services/media";
import { MediaImage } from "../store/media-image";
import { IconButton } from "./kit";

export type PickerProduct = {
  id: string;
  name: LocalizedText;
  image: ImageDTO | null;
  price: number;
};

/** Choose and order products by searching the catalog (name, Arabic spelling variants or SKU). */
export function ProductPicker({
  value,
  onChange,
  search,
  currency,
  max = 24,
}: {
  value: PickerProduct[];
  onChange: (next: PickerProduct[]) => void;
  search: (q: string) => Promise<PickerProduct[]>;
  currency: CurrencyConfig;
  max?: number;
}) {
  const t = useTranslations("admin.picker");
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickerProduct[] | null>(null);
  const [loading, setLoading] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const id = ++latest.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const found = await search(term);
        if (id === latest.current) setResults(found);
      } finally {
        if (id === latest.current) setLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [q, search]);

  const chosen = new Set(value.map((p) => p.id));
  const move = (from: number, to: number) => {
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };
  const price = (p: PickerProduct) => formatMoney(p.price, currency, locale);

  return (
    <div className="space-y-3">
      {value.length ? (
        <ol className="divide-y rounded-xl border" aria-label={t("chosen")}>
          {value.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2.5 px-2.5 py-2">
              <span className="block size-10 shrink-0 overflow-hidden rounded-md bg-surface-muted">
                <MediaImage
                  image={p.image}
                  sizes="40px"
                  alt=""
                  locale={locale}
                  className="size-full"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{tl(p.name, locale)}</span>
                <span className="block text-xs text-muted-foreground">{price(p)}</span>
              </span>
              <IconButton label={t("moveUp")} disabled={i === 0} onClick={() => move(i, i - 1)}>
                <ArrowUp className="size-4" />
              </IconButton>
              <IconButton
                label={t("moveDown")}
                disabled={i === value.length - 1}
                onClick={() => move(i, i + 1)}
              >
                <ArrowDown className="size-4" />
              </IconButton>
              <IconButton
                label={t("remove")}
                danger
                onClick={() => onChange(value.filter((x) => x.id !== p.id))}
              >
                <X className="size-4" />
              </IconButton>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
          {t("none")}
        </p>
      )}

      {value.length < max ? (
        <div>
          <div className="relative">
            <Search
              className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (e.target.value.trim().length < 2) setResults(null);
              }}
              placeholder={t("placeholder")}
              aria-label={t("search")}
              className="ps-10"
            />
            {loading ? (
              <Spinner className="absolute end-3.5 top-1/2 size-4 -translate-y-1/2" />
            ) : null}
          </div>
          {results ? (
            results.length ? (
              <ul className="mt-2 max-h-72 divide-y overflow-y-auto rounded-xl border">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={chosen.has(p.id)}
                      onClick={() => onChange([...value, p])}
                      className="flex w-full items-center gap-2.5 px-2.5 py-2 text-start hover:bg-surface-muted disabled:opacity-50"
                    >
                      <span className="block size-10 shrink-0 overflow-hidden rounded-md bg-surface-muted">
                        <MediaImage
                          image={p.image}
                          sizes="40px"
                          alt=""
                          locale={locale}
                          className="size-full"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {tl(p.name, locale)}
                        </span>
                        <span className="block text-xs text-muted-foreground">{price(p)}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs font-medium text-primary">
                        {chosen.has(p.id) ? (
                          t("added")
                        ) : (
                          <>
                            <Plus className="size-4" aria-hidden="true" />
                            {t("add")}
                          </>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">{t("noResults")}</p>
            )
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("max", { max })}</p>
      )}
    </div>
  );
}
