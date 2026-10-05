import { PackageSearch } from "lucide-react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pickClientMessages } from "@/i18n/client-messages";
import { assertLocale } from "@/i18n/locale";
import { phonePlaceholder } from "@/lib/phone";
import { getSession } from "@/server/auth/session";
import { getStoreContext } from "@/server/store-context";
import { trackOrderAction } from "./actions";
import { TrackForm } from "./track-form";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/track">): Promise<Metadata> {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "track",
  });
  return { title: t("title"), robots: { index: false } };
}

export default async function TrackPage({ params }: PageProps<"/[locale]/track">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const [t, ctx, session, messages] = await Promise.all([
    getTranslations("track"),
    getStoreContext(locale),
    getSession(),
    pickClientMessages("store", "cart", "track"),
  ]);
  return (
    <div className="container-page max-w-md py-8">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-4 inline-flex size-14 items-center justify-center petal-sm bg-primary-soft text-primary">
          <PackageSearch className="size-7" aria-hidden="true" />
        </span>
        <h1 className="font-display text-[1.7rem] leading-tight font-bold">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="rounded-2xl border bg-surface p-5 shadow-card">
        <NextIntlClientProvider messages={messages}>
          <TrackForm
            action={trackOrderAction}
            phonePlaceholder={phonePlaceholder(ctx.settings.general.phoneCode)}
          />
        </NextIntlClientProvider>
      </div>
      {session ? (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("signedInHint")}{" "}
          <Link href="/account/orders" className="font-medium text-primary hover:underline">
            {t("myOrders")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
