"use client";

import { Banknote, Building2, Lock, MapPin, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Alert } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import type { FormState } from "@/lib/form-state";
import { formatMoney, type CurrencyConfig } from "@/lib/money";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { computeTotals, type CouponTerms, type TaxTerms } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { ImageDTO } from "@/server/services/media";
import { MediaImage } from "../media-image";

export type CheckoutLine = {
  id: string;
  name: string;
  label: string | null;
  image: ImageDTO | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type CheckoutZone = {
  id: string;
  name: string;
  fee: number;
  freeShippingThreshold: number | null;
  minDays: number | null;
  maxDays: number | null;
  codAvailable: boolean;
};

export type SavedAddress = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  zoneId: string | null;
  city: string;
  area: string | null;
  street: string | null;
  landmark: string | null;
  isDefault: boolean;
};

type Values = {
  fullName: string;
  phone: string;
  email: string;
  zoneId: string;
  city: string;
  area: string;
  street: string;
  landmark: string;
  note: string;
  paymentMethod: "cod" | "bank_transfer";
};

const REQUIRED: (keyof Values)[] = ["fullName", "phone", "zoneId", "city"];

/**
 * One-page checkout built for phones: numbered sections, the right keyboard for every field,
 * live totals as the delivery area changes, and a pinned "Place order" bar. The server recomputes
 * everything; `expectedTotal` only guarantees the customer is charged what they saw.
 */
export function CheckoutForm({
  action,
  lines,
  zones,
  coupon,
  freeShippingThreshold,
  tax,
  payment,
  requireEmail,
  allowOrderNotes,
  signedIn,
  defaults,
  savedAddresses,
  idempotencyKey,
  currency,
  locale,
  phoneCode,
  phonePlaceholder,
  turnstileKey,
  nonce,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  lines: CheckoutLine[];
  zones: CheckoutZone[];
  coupon: CouponTerms | null;
  freeShippingThreshold: number | null;
  tax: TaxTerms;
  payment: { cod: boolean; codNote: string; bankTransfer: boolean };
  requireEmail: boolean;
  allowOrderNotes: boolean;
  signedIn: boolean;
  defaults: { fullName: string; phone: string; email: string };
  savedAddresses: SavedAddress[];
  idempotencyKey: string;
  currency: CurrencyConfig;
  locale: string;
  phoneCode: string;
  phonePlaceholder: string;
  turnstileKey: string | null;
  nonce?: string;
}) {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const tCommon = useTranslations("common");
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  const initialAddress = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0] ?? null;
  const [addressId, setAddressId] = useState<string | null>(initialAddress?.id ?? null);
  const fromAddress = (a: SavedAddress | null) => ({
    fullName: a?.fullName ?? defaults.fullName,
    phone: a ? formatPhone(a.phone, phoneCode) : defaults.phone,
    zoneId: a?.zoneId && zones.some((z) => z.id === a.zoneId) ? a.zoneId : "",
    city: a?.city ?? "",
    area: a?.area ?? "",
    street: a?.street ?? "",
    landmark: a?.landmark ?? "",
  });
  const [v, setV] = useState<Values>(() => ({
    ...fromAddress(initialAddress),
    email: defaults.email,
    note: "",
    paymentMethod: payment.cod ? "cod" : "bank_transfer",
  }));
  const [saveAddress, setSaveAddress] = useState(true);
  const [clientErrors, setClientErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const serverErrors = state?.fieldErrors ?? {};
  const errorOf = (name: keyof Values) => clientErrors[name] ?? serverErrors[name];

  const zone = zones.find((z) => z.id === v.zoneId) ?? null;
  const codBlocked = Boolean(zone && !zone.codAvailable);
  const totals = useMemo(
    () =>
      computeTotals({
        lines,
        coupon,
        shipping: zone
          ? { fee: zone.fee, freeShippingThreshold: zone.freeShippingThreshold }
          : null,
        freeShippingThreshold,
        tax,
      }),
    [lines, coupon, zone, freeShippingThreshold, tax],
  );
  const money = (n: number) => formatMoney(n, currency, locale);
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);

  // Cash on delivery not offered in this area: use bank transfer instead when it is enabled.
  const method: Values["paymentMethod"] =
    codBlocked && v.paymentMethod === "cod" && payment.bankTransfer
      ? "bank_transfer"
      : v.paymentMethod;

  // Server errors: announce the summary and move focus to the first field to fix.
  const lastState = useRef<FormState>(null);
  useEffect(() => {
    if (!state || state === lastState.current) return;
    lastState.current = state;
    if (state.message) toast.error(state.message);
    const first = Object.keys(state.fieldErrors ?? {})[0];
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }, [state]);

  function set<K extends keyof Values>(name: K, value: Values[K]) {
    setV((prev) => ({ ...prev, [name]: value }));
    if (clientErrors[name]) setClientErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function chooseAddress(id: string | null) {
    setAddressId(id);
    const a = savedAddresses.find((x) => x.id === id) ?? null;
    setV((prev) => ({
      ...prev,
      ...fromAddress(a),
      ...(a ? {} : { fullName: prev.fullName, phone: prev.phone }),
    }));
    setClientErrors({});
  }

  function validate(): boolean {
    const errors: Partial<Record<keyof Values, string>> = {};
    for (const name of REQUIRED) if (!v[name].trim()) errors[name] = tCommon("required");
    if (v.zoneId === "") errors.zoneId = t("errors.zone");
    if (v.phone.trim() && !normalizePhone(v.phone, phoneCode)) errors.phone = t("errors.phone");
    if (requireEmail && !v.email.trim()) errors.email = tCommon("required");
    setClientErrors(errors);
    const first = Object.keys(errors)[0];
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return false;
    }
    return true;
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || !validate()) return;
    if (codBlocked && method === "cod") {
      toast.error(t("errors.codUnavailable"));
      return;
    }
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  }

  const submitLabel = (
    <>
      <Lock className="size-4" aria-hidden="true" />
      {t("placeOrder")}
    </>
  );

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-10"
    >
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="expectedTotal" value={totals.total} />

      <div className="min-w-0 space-y-5">
        {!signedIn ? (
          <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm leading-relaxed">
            {t("haveAccount")}{" "}
            <Link
              href={{ pathname: "/login", query: { next: "/checkout" } }}
              className="font-semibold text-primary hover:underline"
            >
              {t("signIn")}
            </Link>{" "}
            <span className="text-muted-foreground">{t("signInHint")}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{t("guestNote")}</span>
          </p>
        ) : null}

        {state?.message ? (
          <Alert tone="danger">
            {state.message}
            {state.data?.goToCart ? (
              <Link href="/cart" className="ms-2 font-semibold underline">
                {t("editCart")}
              </Link>
            ) : null}
          </Alert>
        ) : null}

        <Section step={1} title={t("contact")}>
          <Field label={t("fullName")} htmlFor="fullName" error={errorOf("fullName")}>
            <Input
              id="fullName"
              name="fullName"
              autoComplete="name"
              value={v.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              maxLength={80}
              aria-invalid={Boolean(errorOf("fullName"))}
              aria-describedby={errorOf("fullName") ? "fullName-error" : undefined}
            />
          </Field>
          <Field label={t("phone")} htmlFor="phone" error={errorOf("phone")} hint={t("phoneHint")}>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder={phonePlaceholder}
              value={v.phone}
              onChange={(e) => set("phone", e.target.value)}
              maxLength={30}
              aria-invalid={Boolean(errorOf("phone"))}
              aria-describedby={errorOf("phone") ? "phone-error" : "phone-hint"}
            />
          </Field>
          <Field
            label={t("email")}
            htmlFor="email"
            error={errorOf("email")}
            hint={t("emailHint")}
            optionalText={requireEmail ? undefined : tCommon("optional")}
          >
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              dir="ltr"
              value={v.email}
              onChange={(e) => set("email", e.target.value)}
              maxLength={254}
              aria-invalid={Boolean(errorOf("email"))}
              aria-describedby={errorOf("email") ? "email-error" : "email-hint"}
            />
          </Field>
        </Section>

        <Section step={2} title={t("delivery")}>
          {savedAddresses.length ? (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t("savedAddresses")}</legend>
              <div className="grid gap-2">
                {savedAddresses.map((a) => (
                  <ChoiceCard
                    key={a.id}
                    name="addressChoice"
                    checked={addressId === a.id}
                    onChange={() => chooseAddress(a.id)}
                  >
                    <span className="block text-sm font-semibold">{a.label || a.fullName}</span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">
                      {[zones.find((z) => z.id === a.zoneId)?.name, a.city, a.area, a.landmark]
                        .filter(Boolean)
                        .join("، ")}
                    </span>
                  </ChoiceCard>
                ))}
                <ChoiceCard
                  name="addressChoice"
                  checked={addressId === null}
                  onChange={() => chooseAddress(null)}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="size-4 text-primary" aria-hidden="true" />
                    {t("newAddress")}
                  </span>
                </ChoiceCard>
              </div>
            </fieldset>
          ) : null}

          <Field
            label={t("zone")}
            htmlFor="zoneId"
            error={errorOf("zoneId")}
            hint={zone ? deliveryHint(zone, t) : undefined}
          >
            <NativeSelect
              id="zoneId"
              name="zoneId"
              value={v.zoneId}
              onChange={(e) => set("zoneId", e.target.value)}
              aria-invalid={Boolean(errorOf("zoneId"))}
            >
              <option value="" disabled>
                {t("zonePlaceholder")}
              </option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} — {z.fee ? money(z.fee) : tCart("free")}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("city")} htmlFor="city" error={errorOf("city")}>
              <Input
                id="city"
                name="city"
                autoComplete="address-level2"
                value={v.city}
                onChange={(e) => set("city", e.target.value)}
                maxLength={80}
                aria-invalid={Boolean(errorOf("city"))}
              />
            </Field>
            <Field label={t("area")} htmlFor="area" optionalText={tCommon("optional")}>
              <Input
                id="area"
                name="area"
                autoComplete="address-level3"
                value={v.area}
                onChange={(e) => set("area", e.target.value)}
                maxLength={120}
              />
            </Field>
          </div>
          <Field label={t("landmark")} htmlFor="landmark" optionalText={tCommon("optional")}>
            <Input
              id="landmark"
              name="landmark"
              placeholder={t("landmarkPlaceholder")}
              value={v.landmark}
              onChange={(e) => set("landmark", e.target.value)}
              maxLength={200}
            />
          </Field>
          <Field label={t("street")} htmlFor="street" optionalText={tCommon("optional")}>
            <Input
              id="street"
              name="street"
              autoComplete="street-address"
              value={v.street}
              onChange={(e) => set("street", e.target.value)}
              maxLength={200}
            />
          </Field>
          {signedIn && addressId === null ? (
            <label className="flex items-center gap-3 text-sm">
              <Checkbox
                name="saveAddress"
                checked={saveAddress}
                onCheckedChange={(c) => setSaveAddress(c === true)}
              />
              {t("saveAddress")}
            </label>
          ) : null}
        </Section>

        <Section step={3} title={t("payment")}>
          <div className="grid gap-2" role="radiogroup" aria-label={t("payment")}>
            {payment.cod ? (
              <ChoiceCard
                name="paymentMethod"
                value="cod"
                checked={method === "cod"}
                onChange={() => set("paymentMethod", "cod")}
                disabled={codBlocked}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Banknote className="size-5 text-primary" aria-hidden="true" />
                  {t("cod")}
                </span>
                <span className="block text-xs leading-relaxed text-muted-foreground">
                  {codBlocked ? t("codUnavailable") : payment.codNote || t("codHint")}
                </span>
              </ChoiceCard>
            ) : null}
            {payment.bankTransfer ? (
              <ChoiceCard
                name="paymentMethod"
                value="bank_transfer"
                checked={method === "bank_transfer"}
                onChange={() => set("paymentMethod", "bank_transfer")}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Building2 className="size-5 text-primary" aria-hidden="true" />
                  {t("bankTransfer")}
                </span>
                <span className="block text-xs leading-relaxed text-muted-foreground">
                  {t("bankTransferHint")}
                </span>
              </ChoiceCard>
            ) : null}
          </div>
          {state?.fieldErrors?.paymentMethod ? (
            <p className="text-sm text-danger">{state.fieldErrors.paymentMethod}</p>
          ) : null}
        </Section>

        {allowOrderNotes ? (
          <Section step={4} title={t("notes")} optional={tCommon("optional")}>
            <Textarea
              id="note"
              name="note"
              rows={3}
              maxLength={500}
              placeholder={t("notePlaceholder")}
              value={v.note}
              onChange={(e) => set("note", e.target.value)}
              aria-label={t("notes")}
            />
          </Section>
        ) : null}

        {turnstileKey ? <Turnstile siteKey={turnstileKey} nonce={nonce} action="checkout" /> : null}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24" aria-label={t("summary")}>
        <div className="rounded-2xl border bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">{t("summary")}</h2>
            <Link href="/cart" className="text-sm font-medium text-primary hover:underline">
              {t("editCart")}
            </Link>
          </div>
          <details className="group mt-3 rounded-xl bg-surface-muted/60" open={lines.length <= 2}>
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <ShoppingBag className="size-4 text-primary" aria-hidden="true" />
              {t("items", { count: itemCount })}
              <span
                className="ms-auto text-xs text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden="true"
              >
                ▾
              </span>
            </summary>
            <ul className="space-y-3 px-3 pt-1 pb-3">
              {lines.map((l) => (
                <li key={l.id} className="flex items-center gap-3">
                  <span className="relative w-12 shrink-0">
                    <span className="block aspect-[4/5] overflow-hidden petal-sm bg-surface-muted">
                      <MediaImage
                        image={l.image}
                        sizes="48px"
                        alt=""
                        locale={locale}
                        className="size-full"
                      />
                    </span>
                    <span className="absolute -end-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[0.65rem] font-bold text-background tabular">
                      {l.quantity}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 text-sm">{l.name}</span>
                    {l.label ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {l.label}
                      </span>
                    ) : null}
                  </span>
                  <bdi className="text-sm font-medium tabular">{money(l.lineTotal)}</bdi>
                </li>
              ))}
            </ul>
          </details>

          <dl className="mt-4 space-y-2.5 text-sm">
            <Row label={tCart("subtotal")} value={money(totals.subtotal)} />
            {totals.discount > 0 ? (
              <Row
                label={`${tCart("discount")} (${coupon?.code})`}
                value={`−${money(totals.discount)}`}
                tone="success"
              />
            ) : null}
            <Row
              label={tCart("shipping")}
              value={
                totals.shipping === null
                  ? t("chooseZone")
                  : totals.shipping === 0
                    ? tCart("free")
                    : money(totals.shipping)
              }
              tone={
                totals.shipping === 0 ? "success" : totals.shipping === null ? "muted" : undefined
              }
            />
            {totals.tax > 0 && !totals.taxIncluded ? (
              <Row label={tCart("tax")} value={money(totals.tax)} />
            ) : null}
            <div className="flex items-baseline justify-between gap-3 border-t pt-3 text-base font-bold">
              <dt>{tCart("total")}</dt>
              <dd className="tabular">
                <bdi>{money(totals.total)}</bdi>
              </dd>
            </div>
            {totals.taxIncluded && totals.tax > 0 ? (
              <p className="text-xs text-muted-foreground">
                {tCart("taxIncluded", { amount: money(totals.tax) })}
              </p>
            ) : null}
          </dl>
        </div>

        <Button type="submit" size="xl" block loading={pending} className="hidden lg:inline-flex">
          {submitLabel}
        </Button>
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {t("agree")}{" "}
          <Link href="/pages/terms" className="underline hover:text-foreground">
            {t("terms")}
          </Link>{" "}
          ·{" "}
          <Link href="/pages/privacy" className="underline hover:text-foreground">
            {t("privacy")}
          </Link>
        </p>
      </aside>

      {/* Phones: total + "Place order" pinned above the home indicator. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0">
            <span className="block text-xs text-muted-foreground">{tCart("total")}</span>
            <bdi className="block text-lg leading-tight font-bold tabular">
              {money(totals.total)}
            </bdi>
          </div>
          <Button type="submit" size="lg" className="h-12 flex-1" loading={pending}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

function deliveryHint(zone: CheckoutZone, t: ReturnType<typeof useTranslations<"checkout">>) {
  if (zone.minDays != null && zone.maxDays != null && zone.maxDays > zone.minDays)
    return t("deliveryRange", { min: zone.minDays, max: zone.maxDays });
  const days = zone.maxDays ?? zone.minDays;
  return days != null ? t("deliveryDays", { days }) : undefined;
}

function Section({
  step,
  title,
  optional,
  children,
}: {
  step: number;
  title: string;
  optional?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border bg-surface p-4 shadow-card sm:p-5"
      aria-labelledby={`step-${step}`}
    >
      <h2 id={`step-${step}`} className="mb-4 flex items-center gap-2.5 font-semibold">
        <span
          className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground tabular"
          aria-hidden="true"
        >
          {step}
        </span>
        {title}
        {optional ? (
          <span className="text-xs font-normal text-muted-foreground">({optional})</span>
        ) : null}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  disabled,
  children,
}: {
  name: string;
  value?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border bg-surface p-3.5 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40",
        checked ? "border-primary bg-primary-soft/50" : "hover:border-primary/40",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
      />
      <span className="min-w-0 flex-1 space-y-0.5">{children}</span>
    </label>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "success" | "muted" }) {
  return (
    <div className={cn("flex justify-between gap-3", tone === "success" && "text-success")}>
      <dt className={tone === "success" ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className={cn("text-end tabular", tone === "muted" && "text-muted-foreground")}>
        <bdi>{value}</bdi>
      </dd>
    </div>
  );
}
