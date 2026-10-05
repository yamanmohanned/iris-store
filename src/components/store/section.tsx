import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function SectionHeading({
  title,
  href,
  linkLabel,
  className,
}: {
  title: ReactNode;
  href?: string | null;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <h2 className="font-display text-[1.45rem] leading-tight font-semibold text-foreground sm:text-2xl">
        {title}
      </h2>
      {href && linkLabel ? (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {linkLabel}
          <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

/** Horizontal, swipeable list on phones (scroll-snap) that becomes a grid on wide screens. */
export function ProductRail({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "-mx-4 rail scroll-px-4 auto-cols-[46%] gap-3 px-4 sm:auto-cols-[31%] md:-mx-6 md:scroll-px-6 md:px-6 lg:mx-0 lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible lg:px-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ProductGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4", className)}
    >
      {children}
    </div>
  );
}
