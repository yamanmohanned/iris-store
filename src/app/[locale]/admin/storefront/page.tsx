import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomeSectionList } from "@/components/admin/home/section-list";
import { assertLocale } from "@/i18n/locale";
import { requireStaffPage } from "@/server/auth/session";
import { getAllHomeSections } from "@/server/services/content";
import {
  deleteHomeSectionAction,
  moveHomeSectionAction,
  setHomeSectionActiveAction,
} from "./actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/storefront">) {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "admin.home",
  });
  return { title: t("title") };
}

export default async function AdminStorefrontPage({
  params,
}: PageProps<"/[locale]/admin/storefront">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  await requireStaffPage(locale, "content:write");
  const rows = await getAllHomeSections();
  return (
    <HomeSectionList
      rows={rows}
      storeHref={locale === "ar" ? "/" : "/en"}
      actions={{
        setActive: setHomeSectionActiveAction,
        move: moveHomeSectionAction,
        remove: deleteHomeSectionAction,
      }}
    />
  );
}
