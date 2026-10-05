"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams();
  const other = locale === "ar" ? "en" : "ar";
  const query = Object.fromEntries(search.entries());
  return (
    <Link
      href={{ pathname, query }}
      locale={other}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground",
        className,
      )}
      hrefLang={other}
      lang={other}
    >
      <Languages className="size-4" aria-hidden="true" />
      {t("switchLanguage")}
    </Link>
  );
}
