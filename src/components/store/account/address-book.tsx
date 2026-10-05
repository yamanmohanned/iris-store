"use client";

import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { FormAlert, SubmitButton } from "@/components/forms/form-controls";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Badge } from "@/components/ui/misc";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { FormState } from "@/lib/form-state";
import { formatPhone } from "@/lib/phone";

export type BookAddress = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  zoneId: string | null;
  zoneName: string | null;
  city: string;
  area: string | null;
  street: string | null;
  landmark: string | null;
  isDefault: boolean;
};

type Actions = {
  save: (prev: FormState, form: FormData) => Promise<FormState>;
  remove: (id: string) => Promise<{ ok: boolean }>;
  makeDefault: (id: string) => Promise<{ ok: boolean }>;
};

export function AddressBook({
  addresses,
  zones,
  actions,
  phoneCode,
  phonePlaceholder,
  max,
}: {
  addresses: BookAddress[];
  zones: { id: string; name: string }[];
  actions: Actions;
  phoneCode: string;
  phonePlaceholder: string;
  max: number;
}) {
  const t = useTranslations("account.addresses");
  const [editing, setEditing] = useState<BookAddress | "new" | null>(null);

  return (
    <>
      {addresses.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center">
          <span className="mb-4 inline-flex size-14 items-center justify-center petal-sm bg-primary-soft text-primary">
            <MapPin className="size-6" aria-hidden="true" />
          </span>
          <h2 className="font-semibold">{t("empty")}</h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">{t("emptyBody")}</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {addresses.map((a) => (
            <AddressCard
              key={a.id}
              address={a}
              phoneCode={phoneCode}
              actions={actions}
              onEdit={() => setEditing(a)}
            />
          ))}
        </ul>
      )}

      {addresses.length < max ? (
        <Button size="lg" className="mt-5" block onClick={() => setEditing("new")}>
          <Plus />
          {t("add")}
        </Button>
      ) : (
        <p className="mt-5 text-center text-sm text-muted-foreground">{t("limit", { max })}</p>
      )}

      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing !== null ? (
          <SheetContent
            side="bottom"
            title={editing === "new" ? t("new") : t("edit")}
            className="sm:mx-auto sm:max-w-lg"
          >
            <AddressForm
              key={editing === "new" ? "new" : editing.id}
              address={editing === "new" ? null : editing}
              zones={zones}
              save={actions.save}
              phoneCode={phoneCode}
              phonePlaceholder={phonePlaceholder}
              onSaved={() => setEditing(null)}
            />
          </SheetContent>
        ) : null}
      </Sheet>
    </>
  );
}

function AddressCard({
  address: a,
  phoneCode,
  actions,
  onEdit,
}: {
  address: BookAddress;
  phoneCode: string;
  actions: Actions;
  onEdit: () => void;
}) {
  const t = useTranslations("account.addresses");
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const id = window.setTimeout(() => setConfirming(false), 4000);
    return () => window.clearTimeout(id);
  }, [confirming]);

  return (
    <li
      className={`rounded-2xl border bg-surface p-4 shadow-card transition-opacity ${pending ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {a.label || a.fullName}
            {a.isDefault ? <Badge tone="primary">{t("default")}</Badge> : null}
          </p>
          {a.label ? <p className="text-sm">{a.fullName}</p> : null}
          <p className="text-sm text-muted-foreground">
            <bdi dir="ltr">{formatPhone(a.phone, phoneCode)}</bdi>
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {[a.zoneName, a.city, a.area, a.street, a.landmark].filter(Boolean).join("، ")}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
        <Button size="sm" variant="ghost" onClick={onEdit} disabled={pending}>
          <Pencil />
          {tCommon("edit")}
        </Button>
        {!a.isDefault ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await actions.makeDefault(a.id);
                if (!r.ok) toast.error(t("saved"));
              })
            }
          >
            <Star />
            {t("makeDefault")}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant={confirming ? "danger" : "ghost"}
          className={confirming ? undefined : "text-danger hover:bg-danger-soft"}
          disabled={pending}
          onClick={() => {
            if (!confirming) {
              setConfirming(true);
              return;
            }
            start(async () => {
              const r = await actions.remove(a.id);
              if (r.ok) toast.success(t("deleted"));
              setConfirming(false);
            });
          }}
        >
          <Trash2 />
          {confirming ? t("confirmDelete") : tCommon("delete")}
        </Button>
      </div>
    </li>
  );
}

function AddressForm({
  address,
  zones,
  save,
  phoneCode,
  phonePlaceholder,
  onSaved,
}: {
  address: BookAddress | null;
  zones: { id: string; name: string }[];
  save: Actions["save"];
  phoneCode: string;
  phonePlaceholder: string;
  onSaved: () => void;
}) {
  const t = useTranslations("account.addresses");
  const tc = useTranslations("checkout");
  const tCommon = useTranslations("common");
  const [state, formAction] = useActionState(save, null);
  const handled = useRef<FormState>(null);
  const err = state?.fieldErrors ?? {};
  const v = (name: string, fallback: string | null | undefined) =>
    state?.values?.[name] ?? fallback ?? "";

  useEffect(() => {
    if (!state || state === handled.current) return;
    handled.current = state;
    if (state.ok) {
      toast.success(state.message ?? t("saved"));
      onSaved();
    }
  }, [state, onSaved, t]);

  return (
    <form action={formAction} className="space-y-4 px-4 pt-1 pb-6" noValidate>
      <FormAlert state={state?.ok ? null : state} />
      {address ? <input type="hidden" name="id" value={address.id} /> : null}
      <Field label={t("label")} htmlFor="a-label" optionalText={tCommon("optional")}>
        <Input
          id="a-label"
          name="label"
          placeholder={t("labelPlaceholder")}
          defaultValue={v("label", address?.label)}
          maxLength={40}
        />
      </Field>
      <Field label={tc("fullName")} htmlFor="a-fullName" error={err.fullName}>
        <Input
          id="a-fullName"
          name="fullName"
          autoComplete="name"
          defaultValue={v("fullName", address?.fullName)}
          maxLength={80}
          aria-invalid={Boolean(err.fullName)}
        />
      </Field>
      <Field label={tc("phone")} htmlFor="a-phone" error={err.phone}>
        <Input
          id="a-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          placeholder={phonePlaceholder}
          defaultValue={v("phone", address ? formatPhone(address.phone, phoneCode) : "")}
          maxLength={30}
          aria-invalid={Boolean(err.phone)}
        />
      </Field>
      <Field label={tc("zone")} htmlFor="a-zoneId" error={err.zoneId}>
        <NativeSelect
          id="a-zoneId"
          name="zoneId"
          defaultValue={v("zoneId", address?.zoneId)}
          aria-invalid={Boolean(err.zoneId)}
        >
          <option value="" disabled>
            {tc("zonePlaceholder")}
          </option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tc("city")} htmlFor="a-city" error={err.city}>
          <Input
            id="a-city"
            name="city"
            autoComplete="address-level2"
            defaultValue={v("city", address?.city)}
            maxLength={80}
            aria-invalid={Boolean(err.city)}
          />
        </Field>
        <Field label={tc("area")} htmlFor="a-area" optionalText={tCommon("optional")}>
          <Input
            id="a-area"
            name="area"
            autoComplete="address-level3"
            defaultValue={v("area", address?.area)}
            maxLength={120}
          />
        </Field>
      </div>
      <Field label={tc("landmark")} htmlFor="a-landmark" optionalText={tCommon("optional")}>
        <Input
          id="a-landmark"
          name="landmark"
          placeholder={tc("landmarkPlaceholder")}
          defaultValue={v("landmark", address?.landmark)}
          maxLength={200}
        />
      </Field>
      <Field label={tc("street")} htmlFor="a-street" optionalText={tCommon("optional")}>
        <Input
          id="a-street"
          name="street"
          autoComplete="street-address"
          defaultValue={v("street", address?.street)}
          maxLength={200}
        />
      </Field>
      {!address?.isDefault ? (
        <label className="flex items-center gap-3 text-sm">
          <Checkbox name="isDefault" defaultChecked={!address} />
          {t("setAsDefault")}
        </label>
      ) : null}
      <SubmitButton block size="lg">
        {tCommon("save")}
      </SubmitButton>
    </form>
  );
}
