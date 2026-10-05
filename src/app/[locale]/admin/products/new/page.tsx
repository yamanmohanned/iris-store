import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductEditor } from "@/components/admin/product-editor";
import { assertLocale } from "@/i18n/locale";
import { requireStaffPage } from "@/server/auth/session";
import { categoryOptions, listCategoriesAdmin } from "@/server/services/admin-catalog";
import { getStoreContext } from "@/server/store-context";
import { deleteProductAction, saveProductAction } from "../actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/products/new">) {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "admin.productEditor",
  });
  return { title: t("titleNew") };
}

export default async function NewProductPage({
  params,
}: PageProps<"/[locale]/admin/products/new">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  await requireStaffPage(locale, "products:write");
  const [ctx, cats] = await Promise.all([getStoreContext(locale), listCategoriesAdmin()]);
  return (
    <ProductEditor
      product={null}
      categories={categoryOptions(cats, locale)}
      currency={ctx.currency}
      saveAction={saveProductAction}
      deleteAction={deleteProductAction}
    />
  );
}
