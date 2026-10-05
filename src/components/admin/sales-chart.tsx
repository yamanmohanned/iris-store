"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { formatMoney, type CurrencyConfig } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Clean tick step (1, 2, 2.5, 5 × 10ⁿ) so the axis reads 0 / 50,000 / 100,000. */
function niceStep(max: number, ticks = 3) {
  const raw = max / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
}

/**
 * Daily sales columns — one series, so no legend (the title names it). Columns are ≤24px with a
 * 4px rounded data end on a single baseline, hairline gridlines with clean ticks, the best day
 * shown by default, and a readout per column on hover and keyboard focus. Screen readers get the
 * same numbers as a table.
 */
export function SalesChart({
  points,
  currency,
  title,
  caption,
}: {
  points: { day: string; orders: number; revenue: number }[];
  currency: CurrencyConfig;
  title: string;
  caption: string;
}) {
  const locale = useLocale();
  const t = useTranslations("admin.dashboard");
  const [active, setActive] = useState<number | null>(null);

  const { top, ticks, best } = useMemo(() => {
    const max = Math.max(0, ...points.map((p) => p.revenue));
    if (max === 0) return { top: 1, ticks: [0], best: -1 };
    const step = niceStep(max);
    const top = Math.ceil(max / step) * step;
    return {
      top,
      ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step),
      best: points.findIndex((p) => p.revenue === max),
    };
  }, [points]);

  const day = new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const compact = new Intl.NumberFormat(`${locale}-u-nu-latn`, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const labelOf = (iso: string) => day.format(new Date(`${iso}T00:00:00Z`));
  const money = (minor: number) => formatMoney(minor, currency, locale);
  const toMajor = (minor: number) => minor / 10 ** currency.decimals;
  const shown = active ?? best;
  const point = shown >= 0 ? points[shown] : undefined;

  return (
    <figure className="rounded-2xl border bg-surface p-4 shadow-card sm:p-5">
      <figcaption className="font-semibold">{title}</figcaption>
      <p className="mb-5 text-xs text-muted-foreground">{caption}</p>

      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40" aria-hidden="true">
          {ticks.map((tick) => (
            <div
              key={tick}
              className="absolute inset-x-0 border-t border-border/70"
              style={{ bottom: `${(tick / top) * 100}%` }}
            >
              <span className="absolute end-0 -translate-y-1/2 bg-surface ps-1.5 text-[0.65rem] text-muted-foreground tabular">
                {compact.format(toMajor(tick))}
              </span>
            </div>
          ))}
        </div>

        <div className="relative flex h-40 items-end gap-0.5 pe-12">
          {points.map((p, i) => (
            <button
              key={p.day}
              type="button"
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="group relative flex h-full flex-1 cursor-default items-end justify-center rounded-sm outline-none focus-visible:bg-primary-soft/60"
              aria-label={`${labelOf(p.day)}: ${money(p.revenue)} · ${t("ordersToday", { count: p.orders })}`}
            >
              <span
                className={cn(
                  "block w-full max-w-6 transition-opacity",
                  p.revenue > 0 ? "rounded-t-[4px] bg-primary" : "h-px bg-border",
                  active !== null && active !== i && "opacity-40",
                )}
                style={
                  p.revenue > 0
                    ? { height: `${Math.max((p.revenue / top) * 100, 1.5)}%` }
                    : undefined
                }
              />
            </button>
          ))}
        </div>

        <div
          className="mt-2 flex justify-between pe-12 text-[0.65rem] text-muted-foreground"
          aria-hidden="true"
        >
          <span>{points[0] ? labelOf(points[0].day) : null}</span>
          <span>{points.at(-1) ? labelOf(points.at(-1)!.day) : null}</span>
        </div>
      </div>

      <div
        className="mt-3 flex min-h-11 items-center gap-3 rounded-xl bg-surface-muted px-3 py-2 text-sm"
        aria-live="polite"
      >
        {point ? (
          <>
            <span className="block h-0.5 w-3 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            <bdi className="font-semibold">{money(point.revenue)}</bdi>
            <span className="text-muted-foreground">
              {labelOf(point.day)} · {t("ordersToday", { count: point.orders })}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">{t("noSales")}</span>
        )}
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.day}>
              <th scope="row">{labelOf(p.day)}</th>
              <td>{money(p.revenue)}</td>
              <td>{t("ordersToday", { count: p.orders })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
