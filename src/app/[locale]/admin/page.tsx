import { setRequestLocale } from "next-intl/server";
import { assertLocale } from "@/i18n/locale";
import { requireStaffPage } from "@/server/auth/session";

// Placeholder dashboard — the full admin is built in phase 6.
export default async function AdminHome({ params }: PageProps<"/[locale]/admin">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const { actor } = await requireStaffPage(locale);
  return (
    <main className="container-page py-10">
      <h1 className="text-2xl font-bold">لوحة التحكم</h1>
      <p className="mt-2 text-muted-foreground" dir="auto">
        {actor.label} · {actor.role}
      </p>
    </main>
  );
}
