"use client";

import { LogOut, ShieldAlert, ShieldCheck, UserMinus, UserPlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/server/db/schema";
import type { StaffRow } from "@/server/services/people-admin";
import { AdminCard, IconButton, PageTitle, useConfirm } from "./kit";

type Result = { ok: boolean; message?: string };
type Actions = {
  assign: (who: { email: string } | { userId: string }, role: UserRole) => Promise<Result>;
  signOut: (userId: string) => Promise<Result>;
};
const STAFF_ROLES = ["order_manager", "catalog_manager", "admin"] as const;

/** Who works in the store and what each person can do. Owners only. */
export function StaffManager({
  rows,
  currentUserId,
  assignable,
  timeZone,
  actions,
}: {
  rows: StaffRow[];
  currentUserId: string;
  assignable: UserRole[];
  timeZone: string;
  actions: Actions;
}) {
  const t = useTranslations("admin.staff");
  const tRoles = useTranslations("admin.roles");
  const [email, setEmail] = useState("");
  const offered = STAFF_ROLES.filter((r) => assignable.includes(r));
  const [role, setRole] = useState<UserRole>(offered[0] ?? "order_manager");
  const [pending, start] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await actions.assign({ email: email.trim() }, role);
      if (r.ok) {
        toast.success(r.message ?? t("saved"));
        setEmail("");
      } else if (r.message) toast.error(r.message);
    });
  }

  return (
    <div className="space-y-5">
      <PageTitle title={t("title")} description={t("intro")} />

      <AdminCard title={t("add")} description={t("addHint")}>
        <form
          onSubmit={add}
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-end"
        >
          <Field label={t("email")} htmlFor="staff-email">
            <Input
              id="staff-email"
              type="email"
              dir="ltr"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </Field>
          <Field label={t("role")} htmlFor="staff-role">
            <NativeSelect
              id="staff-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              {offered.map((r) => (
                <option key={r} value={r}>
                  {tRoles(r)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Button type="submit" size="lg" loading={pending} disabled={!email.trim()}>
            <UserPlus />
            {t("addButton")}
          </Button>
        </form>
      </AdminCard>

      <section>
        <h2 className="mb-2.5 font-semibold">{t("team", { count: rows.length })}</h2>
        <ul className="space-y-2.5">
          {rows.map((row) => (
            <StaffRowItem
              key={row.id}
              row={row}
              self={row.id === currentUserId}
              manageable={row.id !== currentUserId && assignable.includes(row.role)}
              offered={offered}
              timeZone={timeZone}
              actions={actions}
            />
          ))}
        </ul>
      </section>

      <AdminCard title={t("rolesTitle")}>
        <dl className="grid gap-3 sm:grid-cols-2">
          {(["owner", "admin", "order_manager", "catalog_manager"] as const).map((r) => (
            <div key={r} className="rounded-xl bg-surface-muted/60 px-3.5 py-3">
              <dt className="font-medium">{tRoles(r)}</dt>
              <dd className="mt-0.5 text-sm text-muted-foreground">{t(`roleHints.${r}`)}</dd>
            </div>
          ))}
        </dl>
      </AdminCard>
    </div>
  );
}

function StaffRowItem({
  row,
  self,
  manageable,
  offered,
  timeZone,
  actions,
}: {
  row: StaffRow;
  self: boolean;
  manageable: boolean;
  offered: readonly UserRole[];
  timeZone: string;
  actions: Actions;
}) {
  const t = useTranslations("admin.staff");
  const tRoles = useTranslations("admin.roles");
  const locale = useLocale();
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const r = await fn();
      if (r.ok && r.message) toast.success(r.message);
      else if (!r.ok && r.message) toast.error(r.message);
    });
  const when = new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  });
  const selectId = `role-${row.id}`;

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border bg-surface p-3 shadow-card sm:flex-nowrap",
        pending && "opacity-60",
      )}
    >
      <span className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-medium">{row.name}</span>
          {self ? <Badge tone="primary">{t("you")}</Badge> : null}
          {row.twoFactorEnabled ? (
            <Badge tone="success">
              <ShieldCheck className="size-3" aria-hidden="true" />
              {t("twoFactorOn")}
            </Badge>
          ) : (
            <Badge tone="warning">
              <ShieldAlert className="size-3" aria-hidden="true" />
              {t("twoFactorPending")}
            </Badge>
          )}
        </span>
        <span className="block truncate text-sm text-muted-foreground">
          <bdi dir="ltr">{row.email}</bdi>
        </span>
        <span className="block text-xs text-muted-foreground">
          {row.lastLoginAt
            ? t("lastLogin", { date: when.format(new Date(row.lastLoginAt)) })
            : t("neverLoggedIn")}
        </span>
      </span>
      <span className="ms-auto flex items-center gap-1.5">
        {manageable ? (
          <>
            <label htmlFor={selectId} className="sr-only">
              {t("roleOf", { name: row.name })}
            </label>
            <NativeSelect
              id={selectId}
              value={row.role}
              disabled={pending}
              onChange={(e) => {
                const next = e.target.value as UserRole;
                run(() => actions.assign({ userId: row.id }, next));
              }}
              className="h-10 w-44 text-sm"
            >
              {offered.map((r) => (
                <option key={r} value={r}>
                  {tRoles(r)}
                </option>
              ))}
            </NativeSelect>
            <IconButton
              label={t("signOut")}
              disabled={pending || row.activeSessions === 0}
              onClick={() => run(() => actions.signOut(row.id))}
            >
              <LogOut className="size-4" />
            </IconButton>
            <IconButton
              label={confirm.armed ? t("confirmRemove") : t("remove")}
              danger
              active={confirm.armed}
              disabled={pending}
              onClick={() =>
                confirm.tap() && run(() => actions.assign({ userId: row.id }, "customer"))
              }
            >
              <UserMinus className="size-4" />
            </IconButton>
          </>
        ) : (
          <Badge>{tRoles(row.role)}</Badge>
        )}
      </span>
    </li>
  );
}
