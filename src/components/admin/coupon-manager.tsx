"use client";

import { Copy, Pencil, Plus, Power, Shuffle, TicketPercent } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Alert, Badge } from "@/components/ui/misc";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  currencySymbol,
  formatMoney,
  formatNumber,
  moneyInputValue,
  parseMoneyInput,
  type CurrencyConfig,
} from "@/lib/money";
import { cn } from "@/lib/utils";
import type { AdminCouponRow, CouponInput, CouponStatus } from "@/server/services/coupons-admin";
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
  save: (id: string | null, input: CouponInput) => Promise<Result>;
  remove: (id: string) => Promise<Result>;
  setActive: (id: string, active: boolean) => Promise<Result>;
};
type CouponType = AdminCouponRow["type"];

const STATUS_TONE: Record<CouponStatus, "success" | "info" | "neutral" | "warning"> = {
  active: "success",
  scheduled: "info",
  expired: "neutral",
  used_up: "warning",
  inactive: "neutral",
};

/** Unambiguous characters only (no 0/O, 1/I/L) so codes read well when dictated or printed. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function randomCode(length = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

const toLatin = (s: string) => s.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660));
const intOrNull = (s: string) => (s.trim() ? Number(toLatin(s).replace(/\D/g, "")) : null);

export function CouponManager({
  rows,
  currency,
  actions,
}: {
  rows: AdminCouponRow[];
  currency: CurrencyConfig;
  actions: Actions;
}) {
  const t = useTranslations("admin.coupons");
  const [editing, setEditing] = useState<AdminCouponRow | "new" | null>(null);

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

      {rows.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          <TicketPercent className="mb-3 size-8 text-primary" aria-hidden="true" />
          {t("empty")}
        </div>
      ) : (
        <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <CouponTicket
              key={row.id}
              row={row}
              currency={currency}
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
            <CouponForm
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

/** What the customer gets, in one short phrase ("خصم 10% حتى 20,000 د.ع"). */
function useOfferText(currency: CurrencyConfig) {
  const t = useTranslations("admin.coupons");
  const locale = useLocale();
  return (row: Pick<AdminCouponRow, "type" | "value" | "maxDiscount">) => {
    if (row.type === "free_shipping") return t("offer.free_shipping");
    if (row.type === "percentage")
      return row.maxDiscount
        ? t("offer.percentageCapped", {
            value: row.value,
            max: formatMoney(row.maxDiscount, currency, locale),
          })
        : t("offer.percentage", { value: row.value });
    return t("offer.fixed_amount", { amount: formatMoney(row.value, currency, locale) });
  };
}

function CouponTicket({
  row,
  currency,
  actions,
  onEdit,
}: {
  row: AdminCouponRow;
  currency: CurrencyConfig;
  actions: Actions;
  onEdit: () => void;
}) {
  const t = useTranslations("admin.coupons");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const offer = useOfferText(currency);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const r = await fn();
      if (r.ok && r.message) toast.success(r.message);
      else if (!r.ok && r.message) toast.error(r.message);
    });
  const used = row.usedCount > 0 || row.redemptions > 0;
  const dates = dateRange(row.startsOn, row.endsOn, locale, t);
  const share = row.usageLimit ? Math.min(1, row.usedCount / row.usageLimit) : null;

  return (
    <li className={cn("drop-shadow-[0_1px_2px_rgb(23_22_29/0.08)]", pending && "opacity-60")}>
      {/* A ticket: two notches line up with the perforation under the code. */}
      <div className="flex h-full flex-col coupon-ticket bg-surface">
        <div className="flex h-[4.25rem] items-center gap-2 px-4">
          <span className="min-w-0 flex-1 truncate font-mono text-xl font-bold tracking-wider text-primary">
            {/* Isolated so codes like "EID-2026" never reorder inside Arabic text. */}
            <bdi dir="ltr">{row.code}</bdi>
          </span>
          <Badge tone={STATUS_TONE[row.status]}>{t(`status.${row.status}`)}</Badge>
        </div>
        <div aria-hidden="true" className="mx-4 border-t-2 border-dashed border-border" />
        <div className="flex flex-1 flex-col gap-1 px-4 pt-3 pb-2 text-sm">
          <p className="font-semibold">{offer(row)}</p>
          {row.minSubtotal ? (
            <p className="text-muted-foreground">
              {t("minSubtotalShort", { amount: formatMoney(row.minSubtotal, currency, locale) })}
            </p>
          ) : null}
          {dates ? <p className="text-muted-foreground">{dates}</p> : null}
          {row.description ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">{row.description}</p>
          ) : null}
          <div className="mt-auto pt-2">
            <p className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {row.usageLimit
                  ? t("usedOf", { used: row.usedCount, limit: row.usageLimit })
                  : t("used", { count: row.usedCount })}
              </span>
              {row.discountTotal ? (
                <span>
                  {t("given", { amount: formatMoney(row.discountTotal, currency, locale) })}
                </span>
              ) : null}
            </p>
            {share != null ? (
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(share * 100, share > 0 ? 4 : 0)}%` }}
                />
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-end gap-0.5 border-t px-2 py-1.5">
          <IconButton
            label={t("copy")}
            onClick={() =>
              navigator.clipboard
                ?.writeText(row.code)
                .then(() => toast.success(t("copied", { code: `\u2068${row.code}\u2069` })))
                .catch(() => undefined)
            }
          >
            <Copy className="size-4" />
          </IconButton>
          <IconButton
            label={row.isActive ? t("deactivate") : t("activate")}
            disabled={pending}
            onClick={() => run(() => actions.setActive(row.id, !row.isActive))}
          >
            <Power className={cn("size-4", row.isActive && "text-success")} />
          </IconButton>
          <IconButton label={tCommon("edit")} onClick={onEdit}>
            <Pencil className="size-4" />
          </IconButton>
          {used ? null : (
            <DeleteIconButton
              label={tCommon("delete")}
              confirmLabel={t("confirmDelete")}
              disabled={pending}
              onConfirm={() => run(() => actions.remove(row.id))}
            />
          )}
        </div>
      </div>
    </li>
  );
}

function dateRange(
  start: string | null,
  end: string | null,
  locale: string,
  t: ReturnType<typeof useTranslations<"admin.coupons">>,
) {
  const fmt = (day: string) =>
    new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${day}T00:00:00Z`));
  if (start && end) return t("dates.between", { start: fmt(start), end: fmt(end) });
  if (start) return t("dates.from", { start: fmt(start) });
  if (end) return t("dates.until", { end: fmt(end) });
  return null;
}

const FIELDS = ["code", "value", "maxDiscount", "minSubtotal", "endsOn", "usageLimit"];

function CouponForm({
  row,
  currency,
  save,
  onDone,
}: {
  row: AdminCouponRow | null;
  currency: CurrencyConfig;
  save: Actions["save"];
  onDone: () => void;
}) {
  const t = useTranslations("admin.coupons");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const d = currency.decimals;
  const symbol = currencySymbol(currency.currency, locale);
  const offer = useOfferText(currency);
  const [pending, start] = useTransition();
  const [error, setError] = useState<Result | null>(null);
  const [v, setV] = useState({
    code: row?.code ?? "",
    type: (row?.type ?? "percentage") as CouponType,
    percent: row?.type === "percentage" ? String(row.value) : "",
    amount: row?.type === "fixed_amount" ? moneyInputValue(row.value, d) : "",
    maxDiscount: moneyInputValue(row?.maxDiscount ?? null, d),
    minSubtotal: moneyInputValue(row?.minSubtotal ?? null, d),
    startsOn: row?.startsOn ?? "",
    endsOn: row?.endsOn ?? "",
    usageLimit: row?.usageLimit?.toString() ?? "",
    perCustomer: row?.usageLimitPerCustomer?.toString() ?? "",
    description: row?.description ?? "",
    active: row?.isActive ?? true,
  });
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) =>
    setV((p) => ({ ...p, [k]: value }));
  const fail = (field: string, message: string) => setError({ ok: false, field, message });
  const err = (field: string) => (error?.field === field ? error.message : undefined);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const code = toLatin(v.code).replace(/\s+/g, "").toUpperCase();
    if (!/^[\p{L}\p{N}_-]{2,40}$/u.test(code)) return fail("code", t("errors.code"));
    let value = 0;
    if (v.type === "percentage") {
      value = Number(toLatin(v.percent).replace(/[^\d]/g, ""));
      if (!v.percent.trim() || value < 1 || value > 100)
        return fail("value", t("errors.percentage"));
    } else if (v.type === "fixed_amount") {
      const parsed = parseMoneyInput(v.amount, d);
      if (!parsed) return fail("value", t("errors.amount"));
      value = parsed;
    }
    const maxDiscount =
      v.type === "percentage" && v.maxDiscount.trim() ? parseMoneyInput(v.maxDiscount, d) : null;
    if (v.type === "percentage" && v.maxDiscount.trim() && !maxDiscount)
      return fail("maxDiscount", t("errors.amount"));
    const minSubtotal = v.minSubtotal.trim() ? parseMoneyInput(v.minSubtotal, d) : null;
    if (v.minSubtotal.trim() && minSubtotal == null) return fail("minSubtotal", t("errors.amount"));
    if (v.startsOn && v.endsOn && v.endsOn < v.startsOn) return fail("endsOn", t("errors.dates"));
    const usageLimit = intOrNull(v.usageLimit);
    const perCustomer = intOrNull(v.perCustomer);
    if (usageLimit === 0 || perCustomer === 0) return fail("usageLimit", t("errors.limit"));
    setError(null);
    start(async () => {
      const r = await save(row?.id ?? null, {
        code,
        type: v.type,
        value,
        maxDiscount,
        minSubtotal,
        startsOn: v.startsOn || null,
        endsOn: v.endsOn || null,
        usageLimit,
        usageLimitPerCustomer: perCustomer,
        description: v.description.trim() || null,
        isActive: v.active,
      });
      if (r.ok) {
        toast.success(r.message ?? t("saved"));
        onDone();
      } else setError(r);
    });
  }

  const previewValue =
    v.type === "percentage"
      ? Number(toLatin(v.percent).replace(/\D/g, "")) || 0
      : (parseMoneyInput(v.amount, d) ?? 0);
  const preview =
    v.type === "free_shipping" ||
    (previewValue > 0 && (v.type !== "percentage" || previewValue <= 100))
      ? offer({
          type: v.type,
          value: previewValue,
          maxDiscount: v.type === "percentage" ? parseMoneyInput(v.maxDiscount, d) : null,
        })
      : null;

  return (
    <form onSubmit={submit} className="space-y-4 px-4 pt-1" noValidate>
      {error?.message && !FIELDS.includes(error.field ?? "") ? (
        <Alert tone="danger">{error.message}</Alert>
      ) : null}
      <Field label={t("code")} htmlFor="c-code" hint={t("codeHint")} error={err("code")}>
        <div className="flex gap-2">
          <Input
            id="c-code"
            dir="ltr"
            value={v.code}
            onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s+/g, ""))}
            maxLength={40}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="font-mono tracking-wider uppercase"
            aria-invalid={err("code") ? true : undefined}
          />
          <Button
            type="button"
            variant="outline"
            className="h-12 shrink-0"
            onClick={() => set("code", randomCode())}
          >
            <Shuffle />
            {t("generate")}
          </Button>
        </div>
      </Field>

      <fieldset>
        <legend className="text-sm font-medium">{t("type")}</legend>
        <div className="mt-1.5 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("type")}>
          {(["percentage", "fixed_amount", "free_shipping"] as const).map((type) => (
            <label
              key={type}
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-xl border px-2 py-3 text-center text-sm font-medium transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40",
                v.type === type
                  ? "border-primary bg-primary-soft text-primary"
                  : "hover:bg-surface-muted",
              )}
            >
              <input
                type="radio"
                name="coupon-type"
                value={type}
                checked={v.type === type}
                onChange={() => set("type", type)}
                className="sr-only"
              />
              {t(`types.${type}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {v.type === "percentage" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("percent")} htmlFor="c-percent" error={err("value")}>
            <UnitInput
              id="c-percent"
              unit="%"
              inputMode="numeric"
              value={v.percent}
              onChange={(e) =>
                set("percent", toLatin(e.target.value).replace(/\D/g, "").slice(0, 3))
              }
              aria-invalid={err("value") ? true : undefined}
            />
          </Field>
          <MoneyField
            id="c-max"
            label={t("maxDiscount")}
            optionalText={tCommon("optional")}
            symbol={symbol}
            value={v.maxDiscount}
            onChange={(x) => set("maxDiscount", x)}
            error={err("maxDiscount")}
          />
        </div>
      ) : v.type === "fixed_amount" ? (
        <MoneyField
          id="c-amount"
          label={t("amount")}
          symbol={symbol}
          value={v.amount}
          onChange={(x) => set("amount", x)}
          error={err("value")}
        />
      ) : (
        <p className="rounded-xl bg-surface-muted px-3.5 py-2.5 text-sm text-muted-foreground">
          {t("freeShippingHint")}
        </p>
      )}

      {preview ? (
        <p className="text-sm" aria-live="polite">
          <span className="text-muted-foreground">{t("preview")}: </span>
          <span className="font-semibold">{preview}</span>
        </p>
      ) : null}

      <MoneyField
        id="c-min"
        label={t("minSubtotal")}
        hint={t("minSubtotalHint")}
        optionalText={tCommon("optional")}
        symbol={symbol}
        value={v.minSubtotal}
        onChange={(x) => set("minSubtotal", x)}
        error={err("minSubtotal")}
      />

      <fieldset>
        <legend className="text-sm font-medium">
          {t("validity")}
          <span className="ms-1 text-xs font-normal text-muted-foreground">
            ({tCommon("optional")})
          </span>
        </legend>
        <div className="mt-1.5 grid grid-cols-2 gap-3">
          <Field label={t("startsOn")} htmlFor="c-start" className="gap-1">
            <Input
              id="c-start"
              type="date"
              value={v.startsOn}
              onChange={(e) => set("startsOn", e.target.value)}
            />
          </Field>
          <Field label={t("endsOn")} htmlFor="c-end" className="gap-1" error={err("endsOn")}>
            <Input
              id="c-end"
              type="date"
              value={v.endsOn}
              min={v.startsOn || undefined}
              onChange={(e) => set("endsOn", e.target.value)}
              aria-invalid={err("endsOn") ? true : undefined}
            />
          </Field>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{t("validityHint")}</p>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label={t("usageLimit")}
          htmlFor="c-limit"
          optionalText={tCommon("optional")}
          error={err("usageLimit")}
        >
          <Input
            id="c-limit"
            dir="ltr"
            inputMode="numeric"
            value={v.usageLimit}
            placeholder={t("unlimited")}
            onChange={(e) =>
              set("usageLimit", toLatin(e.target.value).replace(/\D/g, "").slice(0, 7))
            }
          />
        </Field>
        <Field label={t("perCustomer")} htmlFor="c-per" optionalText={tCommon("optional")}>
          <Input
            id="c-per"
            dir="ltr"
            inputMode="numeric"
            value={v.perCustomer}
            placeholder={t("unlimited")}
            onChange={(e) =>
              set("perCustomer", toLatin(e.target.value).replace(/\D/g, "").slice(0, 4))
            }
          />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">{t("perCustomerHint")}</p>

      <Field
        label={t("note")}
        htmlFor="c-note"
        hint={t("noteHint")}
        optionalText={tCommon("optional")}
      >
        <Textarea
          id="c-note"
          rows={2}
          value={v.description}
          onChange={(e) => set("description", e.target.value)}
          maxLength={200}
        />
      </Field>
      <ToggleRow
        label={t("active")}
        hint={t("activeHint")}
        checked={v.active}
        onChange={(on) => set("active", on)}
      />
      {row && row.redemptions > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("editUsedHint", { count: formatNumber(row.redemptions, locale) })}
        </p>
      ) : null}
      <SubmitBar label={tCommon("save")} pending={pending} />
    </form>
  );
}
