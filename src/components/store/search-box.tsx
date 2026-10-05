"use client";

import { Clock, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { formatMoney, type CurrencyConfig } from "@/lib/money";
import type { ImageDTO } from "@/server/services/media";
import { MediaImage } from "./media-image";

type Suggestions = {
  products: { slug: string; name: string; image: ImageDTO | null; price: number }[];
  categories: { slug: string; name: string }[];
};

const RECENT_KEY = "iris:recent-searches";

function readRecent(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((v) => typeof v === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}

function saveRecent(q: string) {
  try {
    const next = [q, ...readRecent().filter((r) => r !== q)].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable (private mode): recent searches are a convenience only
  }
}

/** Search field with live suggestions and recent searches (stored only on this device). */
export function SearchBox({
  initialQuery,
  currency,
  autoFocus,
}: {
  initialQuery: string;
  currency: CurrencyConfig;
  autoFocus?: boolean;
}) {
  const t = useTranslations("store");
  const locale = useLocale();
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Suggestions | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const id = window.setTimeout(async () => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      try {
        const res = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(term)}&locale=${locale}`,
          { signal: controller.signal },
        );
        if (res.ok) setData((await res.json()) as Suggestions);
      } catch {
        // aborted or offline: keep the previous suggestions
      }
    }, 200);
    return () => window.clearTimeout(id);
  }, [q, locale]);

  function submit(value: string) {
    const term = value.trim();
    if (!term) return;
    saveRecent(term);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  const showRecent = open && q.trim().length < 2 && recent.length > 0;
  // Suggestions for a previous, longer query are simply hidden once the query gets too short.
  const showSuggestions =
    open &&
    q.trim().length >= 2 &&
    data &&
    (data.products.length > 0 || data.categories.length > 0);

  return (
    <div className="relative">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
      >
        <label className="flex h-12 items-center gap-2 rounded-full border bg-surface px-4 shadow-xs focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/40">
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">{t("searchTitle")}</span>
          <input
            type="search"
            name="q"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setRecent(readRecent());
              setOpen(true);
            }}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            placeholder={t("searchPlaceholder")}
            autoFocus={autoFocus}
            enterKeyHint="search"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={Boolean(showRecent || showSuggestions)}
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label={t("filters.reset")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          ) : null}
        </label>
      </form>

      {showRecent || showSuggestions ? (
        <div
          id={listId}
          className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-2xl border bg-surface shadow-float"
        >
          {showRecent ? (
            <ul className="py-2">
              {recent.map((r) => (
                <li key={r}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => submit(r)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm hover:bg-surface-muted"
                  >
                    <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
                    {r}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {showSuggestions && data ? (
            <div className="py-2">
              {data.categories.length ? (
                <ul className="flex flex-wrap gap-2 px-4 pt-1 pb-3">
                  {data.categories.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/c/${c.slug}`}
                        className="inline-block rounded-full bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary"
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
              <ul>
                {data.products.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/p/${p.slug}`}
                      onClick={() => saveRecent(q.trim())}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-surface-muted"
                    >
                      <span className="size-12 shrink-0 overflow-hidden petal-sm bg-surface-muted">
                        <MediaImage
                          image={p.image}
                          sizes="48px"
                          alt=""
                          locale={locale}
                          className="size-full"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <bdi className="text-xs text-muted-foreground tabular">
                          {formatMoney(p.price, currency, locale)}
                        </bdi>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
