import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionEditor } from "@/components/admin/home/section-editor";
import { assertLocale } from "@/i18n/locale";
import { requireStaffPage } from "@/server/auth/session";
import { HOME_SECTION_TYPES, type HomeSectionType } from "@/server/db/schema";
import { getStoreContext } from "@/server/store-context";
import {
  deleteHomeSectionAction,
  saveHomeSectionAction,
  searchProductsForPickerAction,
} from "../actions";
import { loadSectionEditorData } from "../editor-data";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/storefront/new">) {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "admin.home",
  });
  return { title: t("new") };
}

export default async function NewHomeSectionPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/storefront/new">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  await requireStaffPage(locale, "content:write");
  const type = (await searchParams).type;
  if (typeof type !== "string" || !HOME_SECTION_TYPES.includes(type as HomeSectionType))
    redirect(locale === "ar" ? "/admin/storefront" : `/${locale}/admin/storefront`);
  const [data, ctx] = await Promise.all([
    loadSectionEditorData(null, locale),
    getStoreContext(locale),
  ]);
  return (
    <SectionEditor
      key={type}
      section={null}
      type={type as HomeSectionType}
      currency={ctx.currency}
      {...data}
      save={saveHomeSectionAction}
      remove={deleteHomeSectionAction}
      searchProducts={searchProductsForPickerAction}
    />
  );
}
