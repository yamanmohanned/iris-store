import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageEditor } from "@/components/admin/page-editor";
import { assertLocale } from "@/i18n/locale";
import { requireStaffPage } from "@/server/auth/session";
import { deletePageAction, savePageAction } from "../actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/pages/new">) {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "admin.pages",
  });
  return { title: t("new") };
}

export default async function NewStaticPage({ params }: PageProps<"/[locale]/admin/pages/new">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  await requireStaffPage(locale, "content:write");
  return <PageEditor page={null} viewHref={null} save={savePageAction} remove={deletePageAction} />;
}
