import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function Breadcrumbs({
  items,
  label,
}: {
  items: { href?: string; label: string }[];
  label: string;
}) {
  return (
    <nav aria-label={label} className="text-xs text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 ? <ChevronLeft className="size-3 ltr:rotate-180" aria-hidden="true" /> : null}
            {item.href && i < items.length - 1 ? (
              <Link href={item.href} className="hover:text-primary">
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={i === items.length - 1 ? "page" : undefined}
                className="text-foreground/80"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
