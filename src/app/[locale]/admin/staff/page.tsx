import { getTranslations, setRequestLocale } from "next-intl/server";
import { StaffManager } from "@/components/admin/staff-manager";
import { assertLocale } from "@/i18n/locale";
import { assignableRoles } from "@/server/auth/permissions";
import { requireStaffPage } from "@/server/auth/session";
import { listStaff } from "@/server/services/people-admin";
import { getSetting } from "@/server/services/settings";
import { assignRoleAction, revokeStaffSessionsAction } from "./actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/staff">) {
  const t = await getTranslations({
    locale: assertLocale((await params).locale),
    namespace: "admin.staff",
  });
  return { title: t("title") };
}

export default async function AdminStaffPage({ params }: PageProps<"/[locale]/admin/staff">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const { actor } = await requireStaffPage(locale, "staff:manage");
  const [rows, general] = await Promise.all([listStaff(), getSetting("general")]);
  return (
    <StaffManager
      rows={rows}
      currentUserId={actor.id}
      assignable={assignableRoles(actor.role)}
      timeZone={general.timeZone}
      actions={{ assign: assignRoleAction, signOut: revokeStaffSessionsAction }}
    />
  );
}
