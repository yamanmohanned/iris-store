import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { Card } from "@/components/ui/misc";
import { assertLocale } from "@/i18n/locale";

// Temporary landing page — replaced by the real storefront home in phase 4.
export default function HomePage({ params }: PageProps<"/[locale]">) {
  setRequestLocale(assertLocale(use(params).locale));
  const t = useTranslations("home");
  return (
    <main className="container-page flex min-h-dvh items-center justify-center py-16">
      <Card className="max-w-md p-8 text-center">
        <p className="text-3xl font-bold text-primary">Iris</p>
        <h1 className="mt-4 text-xl font-semibold">{t("comingSoon")}</h1>
        <p className="mt-2 text-muted-foreground">{t("comingSoonBody")}</p>
      </Card>
    </main>
  );
}
