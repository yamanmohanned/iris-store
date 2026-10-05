import { getTranslations, setRequestLocale } from "next-intl/server";
import { CouponManager } from "@/components/admin/coupon-manager";
import { assertLocale } from "@/i18n/locale";
import { requireStaffPage } from "@/server/auth/session";
import { getStoreContext } from "@/server/store-context";
import { listCouponsAdmin } from "@/server/services/coupons-admin";
import { deleteCouponAction, saveCouponAction, setCouponActiveAction } from "./actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/coupons">) {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "admin.coupons",
  });
  return { title: t("title") };
}

export default async function AdminCouponsPage({ params }: PageProps<"/[locale]/admin/coupons">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  await requireStaffPage(locale, "coupons:write");
  const [rows, ctx] = await Promise.all([listCouponsAdmin(), getStoreContext(locale)]);
  return (
    <CouponManager
      rows={rows}
      currency={ctx.currency}
      actions={{
        save: saveCouponAction,
        remove: deleteCouponAction,
        setActive: setCouponActiveAction,
      }}
    />
  );
}
