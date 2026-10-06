import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { PageEditor } from "@/components/admin/page-editor";
import { assertLocale } from "@/i18n/locale";
import { requireStaffPage } from "@/server/auth/session";
import { getPageForEdit } from "@/server/services/content";
import { deletePageAction, savePageAction } from "../actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/pages/[id]">) {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "admin.pages",
  });
  return { title: t("edit") };
}

export default async function EditStaticPage({ params }: PageProps<"/[locale]/admin/pages/[id]">) {
  const { locale: raw, id } = await params;
  const locale = assertLocale(raw);
  setRequestLocale(locale);
  await requireStaffPage(locale, "content:write");
  if (!z.uuid().safeParse(id).success) notFound();
  const page = await getPageForEdit(id);
  if (!page) notFound();
  const prefix = locale === "ar" ? "" : `/${locale}`;
  return (
    <PageEditor
      key={page.id}
      page={page}
      viewHref={page.isPublished ? `${prefix}/pages/${encodeURIComponent(page.slug)}` : null}
      save={savePageAction}
      remove={deletePageAction}
    />
  );
}
