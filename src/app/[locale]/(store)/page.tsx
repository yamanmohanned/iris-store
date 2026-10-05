import { setRequestLocale } from "next-intl/server";
import {
  BannerBlock,
  CategoriesBlock,
  FeaturesBlock,
  HeroBlock,
  ProductsBlock,
  TextBlock,
} from "@/components/store/home/blocks";
import { assertLocale } from "@/i18n/locale";
import { getHomeBlocks } from "@/server/services/storefront";
import { getStoreContext } from "@/server/store-context";

/** Home page = the owner's ordered sections (Admin → Home page). */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const [blocks, ctx] = await Promise.all([getHomeBlocks(), getStoreContext(locale)]);
  const shared = { locale, currency: ctx.currency };

  return (
    <div className="flex flex-col gap-10 pb-4 lg:gap-16">
      {blocks.map((block) => {
        switch (block.type) {
          case "hero":
            return <HeroBlock key={block.id} block={block} {...shared} />;
          case "categories":
            return <CategoriesBlock key={block.id} block={block} {...shared} />;
          case "products":
            return <ProductsBlock key={block.id} block={block} {...shared} />;
          case "banner":
            return <BannerBlock key={block.id} block={block} {...shared} />;
          case "features":
            return <FeaturesBlock key={block.id} block={block} {...shared} />;
          case "text":
            return <TextBlock key={block.id} block={block} {...shared} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
