import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MediaImage } from "@/components/store/media-image";
import { Link } from "@/i18n/navigation";
import { assertLocale } from "@/i18n/locale";
import { tl } from "@/lib/localized";
import { getStoreContext } from "@/server/store-context";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/categories">): Promise<Metadata> {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "store",
  });
  return { title: t("categoriesTitle") };
}

/** Category directory (the "Categories" tab on phones). */
export default async function CategoriesPage({ params }: PageProps<"/[locale]/categories">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const [ctx, t] = await Promise.all([getStoreContext(locale), getTranslations("store")]);

  return (
    <div className="container-page pt-5 pb-6">
      <h1 className="font-display text-3xl font-bold">{t("categoriesTitle")}</h1>
      <div className="mt-6 space-y-8">
        {ctx.categoryTree.map((root) => (
          <section key={root.id}>
            <Link
              href={`/c/${root.slug}`}
              className="group relative block aspect-[21/9] overflow-hidden petal bg-surface-muted sm:aspect-[32/9]"
            >
              <MediaImage
                image={root.image}
                sizes="100vw"
                alt=""
                locale={locale}
                className="absolute inset-0 size-full transition duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-l from-transparent to-black/45 rtl:bg-gradient-to-r" />
              <span className="absolute inset-y-0 start-0 flex items-center p-5">
                <span className="font-display text-2xl font-bold text-white drop-shadow">
                  {tl(root.name, locale)}
                </span>
              </span>
            </Link>
            {root.children.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {root.children.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/c/${c.slug}`}
                      className="inline-block rounded-full border bg-surface px-4 py-2 text-sm hover:border-primary hover:text-primary"
                    >
                      {tl(c.name, locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
