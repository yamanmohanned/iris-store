import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

type Href = Parameters<typeof Link>[0]["href"];

/** "Showing 26–50 of 120" with previous/next links (server component). */
export async function Pager({
  page,
  pageSize,
  total,
  hrefFor,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => Href;
}) {
  if (total <= pageSize && page === 1) return null;
  const t = await getTranslations("admin.pager");
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label={t("label")} className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{t("showing", { from, to, total })}</span>
      <span className="flex gap-2">
        {page > 1 ? (
          <Link
            href={hrefFor(page - 1)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ChevronRight className="ltr:rotate-180" aria-hidden="true" />
            {t("previous")}
          </Link>
        ) : null}
        {to < total ? (
          <Link
            href={hrefFor(page + 1)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("next")}
            <ChevronLeft className="ltr:rotate-180" aria-hidden="true" />
          </Link>
        ) : null}
      </span>
    </nav>
  );
}
