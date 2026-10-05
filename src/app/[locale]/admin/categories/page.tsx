import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryManager } from "@/components/admin/category-manager";
import { assertLocale } from "@/i18n/locale";
import { hasPermission } from "@/server/auth/permissions";
import { requireStaffPage } from "@/server/auth/session";
import { listCategoriesAdmin } from "@/server/services/admin-catalog";
import { deleteCategoryAction, moveCategoryAction, saveCategoryAction } from "./actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/categories">) {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "admin.categories",
  });
  return { title: t("title") };
}

export default async function AdminCategoriesPage({
  params,
}: PageProps<"/[locale]/admin/categories">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const { actor } = await requireStaffPage(locale, "products:write");
  const rows = await listCategoriesAdmin();
  return (
    <CategoryManager
      rows={rows}
      canWrite={hasPermission(actor.role, "products:write")}
      actions={{ save: saveCategoryAction, remove: deleteCategoryAction, move: moveCategoryAction }}
    />
  );
}
