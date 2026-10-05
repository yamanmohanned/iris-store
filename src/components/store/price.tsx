import { formatMoney, type CurrencyConfig } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Price with an optional struck-through "was" price. Numbers are isolated for correct RTL order. */
export function Price({
  amount,
  compareAt,
  currency,
  locale,
  fromLabel,
  wasLabel,
  size = "md",
  className,
}: {
  amount: number;
  compareAt?: number | null;
  currency: CurrencyConfig;
  locale: string;
  fromLabel?: string;
  wasLabel?: (price: string) => string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { sm: "text-sm", md: "text-[0.95rem]", lg: "text-2xl" } as const;
  const was = compareAt && compareAt > amount ? formatMoney(compareAt, currency, locale) : null;
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      {fromLabel ? <span className="text-xs text-muted-foreground">{fromLabel}</span> : null}
      <bdi
        className={cn("font-semibold text-foreground tabular", sizes[size], was && "text-primary")}
      >
        {formatMoney(amount, currency, locale)}
      </bdi>
      {was ? (
        <del className="text-xs text-muted-foreground tabular" aria-label={wasLabel?.(was)}>
          <bdi>{was}</bdi>
        </del>
      ) : null}
    </p>
  );
}
