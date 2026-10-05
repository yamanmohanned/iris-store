import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { assertLocale } from "@/i18n/locale";
import { tl } from "@/lib/localized";
import { sanitizeRichText, stripHtml } from "@/server/security/sanitize";
import { getPublishedPage } from "@/server/services/content";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/pages/[slug]">): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = assertLocale(raw);
  const page = await getPublishedPage(decodeURIComponent(slug));
  if (!page) return {};
  return {
    title: tl(page.seo?.title, locale) || tl(page.title, locale),
    description:
      tl(page.seo?.description, locale) || stripHtml(tl(page.content, locale)).slice(0, 160),
    alternates: {
      canonical: `${locale === "ar" ? "" : `/${locale}`}/pages/${page.slug}`,
      languages: { ar: `/pages/${page.slug}`, en: `/en/pages/${page.slug}` },
    },
  };
}

/** Owner-editable static pages (about, policies, …). */
export default async function StaticPage({ params }: PageProps<"/[locale]/pages/[slug]">) {
  const { locale: raw, slug } = await params;
  const locale = assertLocale(raw);
  setRequestLocale(locale);
  const page = await getPublishedPage(decodeURIComponent(slug));
  if (!page) notFound();
  const t = await getTranslations("store");
  const title = tl(page.title, locale);

  return (
    <article className="container-page max-w-3xl pt-5 pb-10">
      <Breadcrumbs
        label={t("breadcrumb")}
        items={[{ href: "/", label: t("home") }, { label: title }]}
      />
      <h1 className="mt-3 font-display text-3xl leading-tight font-bold">{title}</h1>
      <div
        className="prose-store mt-6"
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(tl(page.content, locale)) }}
      />
    </article>
  );
}
