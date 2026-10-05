"use client";

import { Banknote, Landmark } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Field } from "@/components/ui/label";
import { currencySymbol, moneyInputValue, parseMoneyInput, type CurrencyConfig } from "@/lib/money";
import type { SettingsMap } from "@/server/services/settings";
import { AdminCard, ToggleRow, UnitInput } from "../kit";
import {
  cleanText,
  LocalizedInput,
  MoneySetting,
  sameJson,
  SettingsShell,
  useFieldError,
  type SaveSection,
} from "./shell";

type Checkout = SettingsMap["checkout"];

/** "15" / "7.5" / "٥" → basis points (1500 / 750 / 500); null when invalid. */
function percentToBps(text: string): number | null {
  const s = text
    .trim()
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace("٫", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return null;
  const bps = Math.round(Number(s) * 100);
  return bps <= 10_000 ? bps : null;
}
const bpsToPercent = (bps: number) =>
  bps % 100 ? (bps / 100).toFixed(2).replace(/0$/, "") : String(bps / 100);

export function CheckoutSettingsForm({
  initial,
  currency,
  save,
}: {
  initial: Checkout;
  currency: CurrencyConfig;
  save: SaveSection;
}) {
  const t = useTranslations("admin.settings");
  const locale = useLocale();
  const d = currency.decimals;
  const symbol = currencySymbol(currency.currency, locale);
  const [v, setV] = useState(() => ({
    guestCheckout: initial.guestCheckout,
    requireEmail: initial.requireEmail,
    allowOrderNotes: initial.allowOrderNotes,
    minOrder: initial.minOrderAmount ? moneyInputValue(initial.minOrderAmount, d) : "",
    freeShipping: moneyInputValue(initial.freeShippingThreshold, d),
    cod: initial.cod,
    bankTransfer: initial.bankTransfer,
    taxEnabled: initial.tax.enabled,
    taxRate: initial.tax.rateBps ? bpsToPercent(initial.tax.rateBps) : "",
    pricesIncludeTax: initial.tax.pricesIncludeTax,
  }));
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) =>
    setV((p) => ({ ...p, [k]: value }));

  const build = () => ({
    guestCheckout: v.guestCheckout,
    requireEmail: v.requireEmail,
    allowOrderNotes: v.allowOrderNotes,
    minOrderAmount: v.minOrder.trim() ? parseMoneyInput(v.minOrder, d) : 0,
    freeShippingThreshold: v.freeShipping.trim() ? parseMoneyInput(v.freeShipping, d) : null,
    cod: { enabled: v.cod.enabled, note: cleanText(v.cod.note) },
    bankTransfer: {
      enabled: v.bankTransfer.enabled,
      instructions: cleanText(v.bankTransfer.instructions),
    },
    tax: {
      enabled: v.taxEnabled,
      rateBps: v.taxRate.trim() ? percentToBps(v.taxRate) : 0,
      pricesIncludeTax: v.pricesIncludeTax,
    },
  });
  const current = build();
  const dirty = !sameJson(current, {
    guestCheckout: initial.guestCheckout,
    requireEmail: initial.requireEmail,
    allowOrderNotes: initial.allowOrderNotes,
    minOrderAmount: initial.minOrderAmount,
    freeShippingThreshold: initial.freeShippingThreshold,
    cod: { enabled: initial.cod.enabled, note: cleanText(initial.cod.note) },
    bankTransfer: {
      enabled: initial.bankTransfer.enabled,
      instructions: cleanText(initial.bankTransfer.instructions),
    },
    tax: initial.tax,
  });

  function collect() {
    const errors: Record<string, string> = {};
    if (current.minOrderAmount == null) errors.minOrderAmount = t("errors.amount");
    if (current.freeShippingThreshold === null && v.freeShipping.trim())
      errors.freeShippingThreshold = t("errors.amount");
    if (!current.cod.enabled && !current.bankTransfer.enabled)
      errors.payments = t("errors.payments");
    if (
      current.bankTransfer.enabled &&
      !current.bankTransfer.instructions.ar &&
      !current.bankTransfer.instructions.en
    )
      errors["bankTransfer.instructions"] = t("errors.bankInstructions");
    if (current.tax.enabled && !current.tax.rateBps) errors["tax.rateBps"] = t("errors.taxRate");
    if (current.tax.rateBps == null) errors["tax.rateBps"] = t("errors.taxRate");
    return Object.keys(errors).length ? { errors } : { value: current };
  }

  return (
    <SettingsShell
      section="checkout"
      title={t("sections.checkout.title")}
      description={t("sections.checkout.description")}
      save={save}
      collect={collect}
      dirty={dirty}
      hasEnglish={Boolean(initial.cod.note.en || initial.bankTransfer.instructions.en)}
    >
      <AdminCard title={t("checkout.payments")} description={t("checkout.paymentsHint")}>
        <PaymentsError />
        <div className="space-y-4 rounded-xl border p-3.5">
          <div className="flex items-start gap-3">
            <Banknote className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <ToggleRow
                label={t("checkout.cod")}
                hint={t("checkout.codHint")}
                checked={v.cod.enabled}
                onChange={(enabled) => set("cod", { ...v.cod, enabled })}
              />
            </div>
          </div>
          {v.cod.enabled ? (
            <LocalizedInput
              id="cod-note"
              path="cod.note"
              label={t("checkout.codNote")}
              placeholder={t("checkout.codNotePlaceholder")}
              value={v.cod.note}
              onChange={(note) => set("cod", { ...v.cod, note })}
              max={300}
              optional
            />
          ) : null}
        </div>
        <div className="space-y-4 rounded-xl border p-3.5">
          <div className="flex items-start gap-3">
            <Landmark className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <ToggleRow
                label={t("checkout.bank")}
                hint={t("checkout.bankHint")}
                checked={v.bankTransfer.enabled}
                onChange={(enabled) => set("bankTransfer", { ...v.bankTransfer, enabled })}
              />
            </div>
          </div>
          {v.bankTransfer.enabled ? (
            <LocalizedInput
              id="bank-instructions"
              path="bankTransfer.instructions"
              label={t("checkout.bankInstructions")}
              hint={t("checkout.bankInstructionsHint")}
              value={v.bankTransfer.instructions}
              onChange={(instructions) => set("bankTransfer", { ...v.bankTransfer, instructions })}
              max={1000}
              rows={4}
            />
          ) : null}
        </div>
      </AdminCard>

      <AdminCard title={t("checkout.amounts")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneySetting
            id="min-order"
            path="minOrderAmount"
            label={t("checkout.minOrder")}
            hint={t("checkout.minOrderHint")}
            optional
            symbol={symbol}
            value={v.minOrder}
            onChange={(x) => set("minOrder", x)}
          />
          <MoneySetting
            id="free-shipping"
            path="freeShippingThreshold"
            label={t("checkout.freeShipping")}
            hint={t("checkout.freeShippingHint")}
            optional
            symbol={symbol}
            value={v.freeShipping}
            onChange={(x) => set("freeShipping", x)}
          />
        </div>
      </AdminCard>

      <AdminCard title={t("checkout.form")}>
        <ToggleRow
          label={t("checkout.guest")}
          hint={t("checkout.guestHint")}
          checked={v.guestCheckout}
          onChange={(on) => set("guestCheckout", on)}
        />
        <ToggleRow
          label={t("checkout.requireEmail")}
          hint={t("checkout.requireEmailHint")}
          checked={v.requireEmail}
          onChange={(on) => set("requireEmail", on)}
        />
        <ToggleRow
          label={t("checkout.notes")}
          hint={t("checkout.notesHint")}
          checked={v.allowOrderNotes}
          onChange={(on) => set("allowOrderNotes", on)}
        />
      </AdminCard>

      <AdminCard title={t("checkout.tax")} description={t("checkout.taxHint")}>
        <ToggleRow
          label={t("checkout.taxOn")}
          checked={v.taxEnabled}
          onChange={(on) => set("taxEnabled", on)}
        />
        {v.taxEnabled ? (
          <>
            <TaxRate value={v.taxRate} onChange={(x) => set("taxRate", x)} />
            <ToggleRow
              label={t("checkout.taxIncluded")}
              hint={t("checkout.taxIncludedHint")}
              checked={v.pricesIncludeTax}
              onChange={(on) => set("pricesIncludeTax", on)}
            />
          </>
        ) : null}
      </AdminCard>
    </SettingsShell>
  );
}

function PaymentsError() {
  const error = useFieldError("payments");
  return error ? (
    <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
      {error}
    </p>
  ) : null;
}

function TaxRate({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations("admin.settings");
  const error = useFieldError("tax.rateBps");
  return (
    <Field label={t("checkout.taxRate")} htmlFor="tax-rate" error={error} className="sm:max-w-56">
      <UnitInput
        id="tax-rate"
        unit="%"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
      />
    </Field>
  );
}
