import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageList } from "@/components/admin/page-list";
import { assertLocale } from "@/i18n/locale";
import { requireStaffPage } from "@/server/auth/session";
import { listPagesAdmin } from "@/server/services/content";
import { deletePageAction, movePageAction } from "./actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/pages">) {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "admin.pages",
  });
  return { title: t("title") };
}

export default async function AdminPagesPage({ params }: PageProps<"/[locale]/admin/pages">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  await requireStaffPage(locale, "content:write");
  const rows = await listPagesAdmin();
  return <PageList rows={rows} actions={{ move: movePageAction, remove: deletePageAction }} />;
}
