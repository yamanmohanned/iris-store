import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { SectionEditor } from "@/components/admin/home/section-editor";
import { assertLocale } from "@/i18n/locale";
import { requireStaffPage } from "@/server/auth/session";
import { getHomeSection } from "@/server/services/content";
import { getStoreContext } from "@/server/store-context";
import {
  deleteHomeSectionAction,
  saveHomeSectionAction,
  searchProductsForPickerAction,
} from "../actions";
import { loadSectionEditorData } from "../editor-data";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/storefront/[id]">) {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "admin.home",
  });
  return { title: t("title") };
}

export default async function EditHomeSectionPage({
  params,
}: PageProps<"/[locale]/admin/storefront/[id]">) {
  const { locale: raw, id } = await params;
  const locale = assertLocale(raw);
  setRequestLocale(locale);
  await requireStaffPage(locale, "content:write");
  if (!z.uuid().safeParse(id).success) notFound();
  const section = await getHomeSection(id);
  if (!section) notFound();
  const [data, ctx] = await Promise.all([
    loadSectionEditorData(section, locale),
    getStoreContext(locale),
  ]);
  return (
    <SectionEditor
      key={section.id}
      section={section}
      type={section.type}
      currency={ctx.currency}
      {...data}
      save={saveHomeSectionAction}
      remove={deleteHomeSectionAction}
      searchProducts={searchProductsForPickerAction}
    />
  );
}
