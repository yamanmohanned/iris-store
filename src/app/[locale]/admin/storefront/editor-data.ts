import "server-only";
import type { PickerProduct } from "@/components/admin/product-picker";
import {
  categoryOptions,
  listCategoriesAdmin,
  listProductsAdmin,
} from "@/server/services/admin-catalog";
import type { HomeSectionDTO } from "@/server/services/content";
import type { ImageDTO } from "@/server/services/media";
import { imagesByIds } from "@/server/services/storefront";

/** Everything the block editor needs besides the block itself. */
export async function loadSectionEditorData(section: HomeSectionDTO | null, locale: string) {
  const imageIds =
    section?.type === "hero"
      ? section.config.slides.map((s) => s.imageId ?? "")
      : section?.type === "banner"
        ? [section.config.imageId ?? ""]
        : [];
  const productIds =
    section?.type === "products" && section.config.source === "manual"
      ? section.config.productIds
      : [];
  const [rows, images, products] = await Promise.all([
    listCategoriesAdmin(),
    imagesByIds(imageIds),
    productIds.length
      ? listProductsAdmin({ ids: productIds, pageSize: productIds.length })
      : Promise.resolve(null),
  ]);
  const byId = new Map(products?.items.map((p) => [p.id, p]));
  const picked: PickerProduct[] = productIds.flatMap((id) => {
    const p = byId.get(id);
    return p ? [{ id: p.id, name: p.name, image: p.image, price: p.minPrice }] : [];
  });
  return {
    categories: categoryOptions(rows, locale),
    images: Object.fromEntries(images) as Record<string, ImageDTO>,
    picked,
  };
}
