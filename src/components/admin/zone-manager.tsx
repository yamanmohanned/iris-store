"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Truck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Alert, Badge } from "@/components/ui/misc";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { tl } from "@/lib/localized";
import {
  currencySymbol,
  formatMoney,
  moneyInputValue,
  parseMoneyInput,
  type CurrencyConfig,
} from "@/lib/money";
import { cn } from "@/lib/utils";
import type { AdminZoneRow, ZoneInput } from "@/server/services/shipping-admin";
import {
  DeleteIconButton,
  IconButton,
  MoneyField,
  PageTitle,
  SubmitBar,
  ToggleRow,
  UnitInput,
} from "./kit";

type Result = { ok: boolean; message?: string; field?: string };
type Actions = {
  save: (id: string | null, input: ZoneInput) => Promise<Result>;
  remove: (id: string) => Promise<Result>;
  move: (id: string, direction: "up" | "down") => Promise<Result>;
};

/** Delivery areas: what customers pick at checkout, with the fee added to their order. */
export function ZoneManager({
  rows,
  currency,
  storeFreeShipping,
  actions,
}: {
  rows: AdminZoneRow[];
  currency: CurrencyConfig;
  storeFreeShipping: number | null;
  actions: Actions;
}) {
  const t = useTranslations("admin.shipping");
  const locale = useLocale();
  const [editing, setEditing] = useState<AdminZoneRow | "new" | null>(null);
  const money = (v: number) => formatMoney(v, currency, locale);

  return (
    <>
      <PageTitle
        title={t("title")}
        description={t("intro")}
        action={
          <Button onClick={() => setEditing("new")}>
            <Plus />
            {t("new")}
          </Button>
        }
      />

      <p className="mt-4 rounded-xl bg-primary-soft/60 px-3.5 py-2.5 text-sm">
        {storeFreeShipping != null
          ? t("storeFree", { amount: money(storeFreeShipping) })
          : t("storeFreeOff")}{" "}
        <Link href="/admin/settings/checkout" className="font-medium text-primary underline">
          {t("storeFreeLink")}
        </Link>
      </p>

      {rows.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          <Truck className="mb-3 size-8 text-primary" aria-hidden="true" />
          {t("empty")}
        </div>
      ) : (
        <ul className="mt-5 divide-y overflow-hidden rounded-2xl border bg-surface shadow-card">
          {rows.map((row, i) => (
            <ZoneRow
              key={row.id}
              row={row}
              first={i === 0}
              last={i === rows.length - 1}
              money={money}
              actions={actions}
              onEdit={() => setEditing(row)}
            />
          ))}
        </ul>
      )}

      <Sheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing !== null ? (
          <SheetContent
            side="bottom"
            title={editing === "new" ? t("new") : t("edit")}
            className="sm:mx-auto sm:max-w-lg"
          >
            <ZoneForm
              key={editing === "new" ? "new" : editing.id}
              row={editing === "new" ? null : editing}
              currency={currency}
              save={actions.save}
              onDone={() => setEditing(null)}
            />
          </SheetContent>
        ) : null}
      </Sheet>
    </>
  );
}

function ZoneRow({
  row,
  first,
  last,
  money,
  actions,
  onEdit,
}: {
  row: AdminZoneRow;
  first: boolean;
  last: boolean;
  money: (v: number) => string;
  actions: Actions;
  onEdit: () => void;
}) {
  const t = useTranslations("admin.shipping");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const r = await fn();
      if (r.ok && r.message) toast.success(r.message);
      else if (!r.ok && r.message) toast.error(r.message);
    });
  const days =
    row.minDays != null && row.maxDays != null && row.minDays !== row.maxDays
      ? t("daysRange", { min: row.minDays, max: row.maxDays })
      : row.maxDays != null || row.minDays != null
        ? t("days", { count: (row.maxDays ?? row.minDays)! })
        : null;

  return (
    <li className={cn("flex items-center gap-3 px-3 py-2.5 sm:px-4", pending && "opacity-60")}>
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-start">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-medium">{tl(row.name, locale)}</span>
          {!row.isActive ? <Badge>{t("hidden")}</Badge> : null}
          {!row.codAvailable ? <Badge tone="warning">{t("noCod")}</Badge> : null}
        </span>
        <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">
            {row.fee === 0 ? t("free") : money(row.fee)}
          </span>
          {days ? <span>· {days}</span> : null}
          {row.freeShippingThreshold != null ? (
            <span>· {t("freeAbove", { amount: money(row.freeShippingThreshold) })}</span>
          ) : null}
          {row.orderCount ? <span>· {t("orders", { count: row.orderCount })}</span> : null}
        </span>
      </button>
      <span className="flex items-center gap-0.5">
        <IconButton
          label={t("moveUp")}
          disabled={first || pending}
          onClick={() => run(() => actions.move(row.id, "up"))}
        >
          <ArrowUp className="size-4" />
        </IconButton>
        <IconButton
          label={t("moveDown")}
          disabled={last || pending}
          onClick={() => run(() => actions.move(row.id, "down"))}
        >
          <ArrowDown className="size-4" />
        </IconButton>
        <IconButton label={tCommon("edit")} onClick={onEdit}>
          <Pencil className="size-4" />
        </IconButton>
        <DeleteIconButton
          label={tCommon("delete")}
          confirmLabel={t("confirmDelete")}
          disabled={pending}
          onConfirm={() => run(() => actions.remove(row.id))}
        />
      </span>
    </li>
  );
}

function ZoneForm({
  row,
  currency,
  save,
  onDone,
}: {
  row: AdminZoneRow | null;
  currency: CurrencyConfig;
  save: Actions["save"];
  onDone: () => void;
}) {
  const t = useTranslations("admin.shipping");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const d = currency.decimals;
  const symbol = currencySymbol(currency.currency, locale);
  const [pending, start] = useTransition();
  const [error, setError] = useState<Result | null>(null);
  const [v, setV] = useState({
    nameAr: row?.name.ar ?? "",
    nameEn: row?.name.en ?? "",
    fee: moneyInputValue(row?.fee ?? null, d),
    free: moneyInputValue(row?.freeShippingThreshold ?? null, d),
    minDays: row?.minDays?.toString() ?? "",
    maxDays: row?.maxDays?.toString() ?? "",
    cod: row?.codAvailable ?? true,
    active: row?.isActive ?? true,
  });
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) =>
    setV((p) => ({ ...p, [k]: value }));
  const fail = (field: string, message: string) => setError({ ok: false, field, message });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!v.nameAr.trim() && !v.nameEn.trim()) return fail("name", t("errors.name"));
    const fee = v.fee.trim() ? parseMoneyInput(v.fee, d) : 0;
    if (fee == null) return fail("fee", t("errors.amount"));
    const free = v.free.trim() ? parseMoneyInput(v.free, d) : null;
    if (v.free.trim() && free == null) return fail("free", t("errors.amount"));
    const minDays = v.minDays ? Number(v.minDays) : null;
    const maxDays = v.maxDays ? Number(v.maxDays) : null;
    if (minDays != null && maxDays != null && minDays > maxDays)
      return fail("days", t("errors.days"));
    setError(null);
    start(async () => {
      const r = await save(row?.id ?? null, {
        name: { ar: v.nameAr.trim(), en: v.nameEn.trim() },
        fee,
        freeShippingThreshold: free,
        minDays,
        maxDays,
        codAvailable: v.cod,
        isActive: v.active,
      });
      if (r.ok) {
        toast.success(r.message ?? t("saved"));
        onDone();
      } else setError(r);
    });
  }

  const digits = (s: string) =>
    s
      .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
      .replace(/\D/g, "")
      .slice(0, 2);

  return (
    <form onSubmit={submit} className="space-y-4 px-4 pt-1" noValidate>
      {error?.message && !["name", "fee", "free", "days"].includes(error.field ?? "") ? (
        <Alert tone="danger">{error.message}</Alert>
      ) : null}
      <Field
        label={t("name")}
        htmlFor="z-name"
        error={error?.field === "name" ? error.message : undefined}
      >
        <Input
          id="z-name"
          value={v.nameAr}
          onChange={(e) => set("nameAr", e.target.value)}
          maxLength={80}
          placeholder={t("namePlaceholder")}
          aria-invalid={error?.field === "name" || undefined}
        />
      </Field>
      <Field label={t("nameEn")} htmlFor="z-name-en" optionalText={tCommon("optional")}>
        <Input
          id="z-name-en"
          dir="ltr"
          value={v.nameEn}
          onChange={(e) => set("nameEn", e.target.value)}
          maxLength={80}
        />
      </Field>
      <MoneyField
        id="z-fee"
        label={t("fee")}
        hint={t("feeHint")}
        symbol={symbol}
        value={v.fee}
        placeholder="0"
        onChange={(x) => set("fee", x)}
        error={error?.field === "fee" ? error.message : undefined}
      />
      <MoneyField
        id="z-free"
        label={t("freeThreshold")}
        hint={t("freeThresholdHint")}
        optionalText={tCommon("optional")}
        symbol={symbol}
        value={v.free}
        onChange={(x) => set("free", x)}
        error={error?.field === "free" ? error.message : undefined}
      />
      <fieldset>
        <legend className="text-sm font-medium">
          {t("deliveryTime")}
          <span className="ms-1 text-xs font-normal text-muted-foreground">
            ({tCommon("optional")})
          </span>
        </legend>
        <div className="mt-1.5 grid grid-cols-2 gap-3">
          <UnitInput
            aria-label={t("minDays")}
            unit={t("dayUnit")}
            inputMode="numeric"
            placeholder={t("minDays")}
            value={v.minDays}
            onChange={(e) => set("minDays", digits(e.target.value))}
            aria-invalid={error?.field === "days" || undefined}
          />
          <UnitInput
            aria-label={t("maxDays")}
            unit={t("dayUnit")}
            inputMode="numeric"
            placeholder={t("maxDays")}
            value={v.maxDays}
            onChange={(e) => set("maxDays", digits(e.target.value))}
            aria-invalid={error?.field === "days" || undefined}
          />
        </div>
        {error?.field === "days" ? (
          <p role="alert" className="mt-1.5 text-sm text-danger">
            {error.message}
          </p>
        ) : null}
      </fieldset>
      <ToggleRow
        label={t("cod")}
        hint={t("codHint")}
        checked={v.cod}
        onChange={(on) => set("cod", on)}
      />
      <ToggleRow
        label={t("active")}
        hint={t("activeHint")}
        checked={v.active}
        onChange={(on) => set("active", on)}
      />
      <SubmitBar label={tCommon("save")} pending={pending} />
    </form>
  );
}
