import { Download, FileSpreadsheet } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminCard, PageTitle } from "@/components/admin/kit";
import { ProductImport } from "@/components/admin/product-import";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { requireStaffPage } from "@/server/auth/session";
import { applyImportAction, previewImportAction } from "./actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/products/import">) {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "admin.productImport",
  });
  return { title: t("title") };
}

const RULES = ["rows", "match", "columns", "images", "baseline", "all"] as const;

export default async function ProductImportPage({
  params,
}: PageProps<"/[locale]/admin/products/import">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  await requireStaffPage(locale, "products:write");
  const t = await getTranslations("admin.productImport");
  const lang = locale === "en" ? "en" : "ar";

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Link
          href="/admin/products"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {t("back")}
        </Link>
        <PageTitle title={t("title")} description={t("subtitle")} />
      </div>

      <AdminCard title={t("exportTitle")} description={t("exportBody")}>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/admin/products/export?lang=${lang}`}
            download
            className={buttonVariants({ variant: "secondary" })}
          >
            <Download aria-hidden="true" />
            {t("exportButton")}
          </a>
          <a
            href={`/api/admin/products/export?template=1&lang=${lang}`}
            download
            className={buttonVariants({ variant: "ghost" })}
          >
            <FileSpreadsheet aria-hidden="true" />
            {t("templateButton")}
          </a>
        </div>
      </AdminCard>

      <AdminCard title={t("importTitle")}>
        <ProductImport previewAction={previewImportAction} applyAction={applyImportAction} />
      </AdminCard>

      <AdminCard title={t("rulesTitle")}>
        <ul className="list-disc space-y-1.5 ps-5 text-sm text-muted-foreground">
          {RULES.map((rule) => (
            <li key={rule}>{t(`rules.${rule}`)}</li>
          ))}
        </ul>
      </AdminCard>
    </div>
  );
}
