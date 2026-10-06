"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
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
 * 4px rounded data end on a single baseline, hairline gridlines with clean ticks, and the best day
 * shown by default. The whole plot is one target: pointing at or dragging across it shows a day's
 * readout (thin columns would be too small to tap one by one), and the arrow keys step through the
 * days as a slider. Screen readers also get the numbers as a table.
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
  const readout = (p: (typeof points)[number]) =>
    `${labelOf(p.day)}: ${money(p.revenue)} · ${t("ordersToday", { count: p.orders })}`;

  const plot = useRef<HTMLDivElement>(null);
  const isRtl = () => plot.current?.closest("[dir]")?.getAttribute("dir") === "rtl";
  const clamp = (i: number) => Math.min(points.length - 1, Math.max(0, i));

  function pointAt(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const fromStart = isRtl() ? rect.right - event.clientX : event.clientX - rect.left;
    setActive(clamp(Math.floor((fromStart / rect.width) * points.length)));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = active ?? Math.max(best, 0);
    // Later days sit at the inline end: left of the screen in Arabic, right in English.
    const later = isRtl() ? "ArrowLeft" : "ArrowRight";
    const earlier = isRtl() ? "ArrowRight" : "ArrowLeft";
    const next =
      event.key === later || event.key === "ArrowUp"
        ? current + 1
        : event.key === earlier || event.key === "ArrowDown"
          ? current - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? points.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    setActive(clamp(next));
  }

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

        <div className="pe-12">
          <div
            ref={plot}
            role="slider"
            tabIndex={points.length ? 0 : -1}
            aria-label={title}
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={Math.max(points.length - 1, 0)}
            aria-valuenow={Math.max(shown, 0)}
            aria-valuetext={point ? readout(point) : t("noSales")}
            onPointerMove={pointAt}
            onPointerDown={pointAt}
            onPointerLeave={(event) => {
              // A tap keeps its readout; a mouse leaving the chart returns to the best day.
              if (event.pointerType === "mouse") setActive(null);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
            className="relative flex h-40 touch-pan-y items-end gap-0.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {points.map((p, i) => (
              <span key={p.day} className="flex h-full flex-1 items-end justify-center">
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
              </span>
            ))}
          </div>
        </div>

        <div
          className="mt-2 flex justify-between pe-12 text-[0.65rem] text-muted-foreground"
          aria-hidden="true"
        >
          <span>{points[0] ? labelOf(points[0].day) : null}</span>
          <span>{points.at(-1) ? labelOf(points.at(-1)!.day) : null}</span>
        </div>
      </div>

      {/* The slider already announces each day to screen readers. */}
      <div
        className="mt-3 flex min-h-11 items-center gap-3 rounded-xl bg-surface-muted px-3 py-2 text-sm"
        aria-hidden="true"
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
