import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <main className="container-page flex min-h-[70dvh] flex-col items-center justify-center py-16 text-center">
      <p className="text-7xl font-bold text-primary tabular">404</p>
      <h1 className="mt-4 text-2xl font-semibold">{t("notFoundTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("notFoundBody")}</p>
      <Link href="/" className={buttonVariants({ className: "mt-8" })}>
        {t("goHome")}
      </Link>
    </main>
  );
}
