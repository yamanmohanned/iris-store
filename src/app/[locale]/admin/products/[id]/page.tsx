import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { z } from "zod";
import { ProductEditor } from "@/components/admin/product-editor";
import { assertLocale } from "@/i18n/locale";
import { tl } from "@/lib/localized";
import { requireStaffPage } from "@/server/auth/session";
import {
  categoryOptions,
  getProductForEdit,
  listCategoriesAdmin,
} from "@/server/services/admin-catalog";
import { getStoreContext } from "@/server/store-context";
import { deleteProductAction, saveProductAction } from "../actions";

const load = async (id: string) => (z.uuid().safeParse(id).success ? getProductForEdit(id) : null);

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/products/[id]">) {
  const { locale, id } = await params;
  const product = await load(id);
  return { title: product ? tl(product.name, assertLocale(locale)) : undefined };
}

export default async function EditProductPage({
  params,
}: PageProps<"/[locale]/admin/products/[id]">) {
  const { locale: raw, id } = await params;
  const locale = assertLocale(raw);
  setRequestLocale(locale);
  await requireStaffPage(locale, "products:write");
  const [product, ctx, cats] = await Promise.all([
    load(id),
    getStoreContext(locale),
    listCategoriesAdmin(),
  ]);
  if (!product) notFound();
  return (
    <ProductEditor
      // Re-mount after every save so the editor starts from the saved version (fresh concurrency stamp).
      key={product.updatedAt}
      product={product}
      categories={categoryOptions(cats, locale)}
      currency={ctx.currency}
      saveAction={saveProductAction}
      deleteAction={deleteProductAction}
    />
  );
}
