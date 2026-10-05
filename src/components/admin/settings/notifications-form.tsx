"use client";

import { Mail, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SettingsMap } from "@/server/services/settings";
import { AdminCard, IconButton, ToggleRow, UnitInput } from "../kit";
import { sameJson, SettingsShell, useFieldError, type SaveSection } from "./shell";

type Notifications = SettingsMap["notifications"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAILS = 5;

export function NotificationsSettingsForm({
  initial,
  emailConfigured,
  save,
}: {
  initial: Notifications;
  emailConfigured: boolean;
  save: SaveSection;
}) {
  const t = useTranslations("admin.settings");
  const [emails, setEmails] = useState<string[]>(
    initial.adminEmails.length ? initial.adminEmails : [""],
  );
  const [v, setV] = useState({
    notifyNewOrder: initial.notifyNewOrder,
    notifyLowStock: initial.notifyLowStock,
    lowStockThreshold: String(initial.lowStockThreshold),
    customerStatusEmails: initial.customerStatusEmails,
  });

  const cleanEmails = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
  const current = {
    adminEmails: [...new Set(cleanEmails)],
    notifyNewOrder: v.notifyNewOrder,
    notifyLowStock: v.notifyLowStock,
    lowStockThreshold: Number(v.lowStockThreshold || 0),
    customerStatusEmails: v.customerStatusEmails,
  };
  const dirty = !sameJson(current, initial);

  function collect() {
    const errors: Record<string, string> = {};
    emails.forEach((e, i) => {
      if (e.trim() && !EMAIL.test(e.trim())) errors[`adminEmails.${i}`] = t("errors.email");
    });
    if (current.lowStockThreshold > 1000) errors.lowStockThreshold = t("errors.threshold");
    return Object.keys(errors).length ? { errors } : { value: current };
  }

  return (
    <SettingsShell
      section="notifications"
      title={t("sections.notifications.title")}
      description={t("sections.notifications.description")}
      save={save}
      collect={collect}
      dirty={dirty}
      hasEnglish={false}
      bilingual={false}
    >
      {!emailConfigured ? (
        <p className="rounded-2xl bg-warning-soft px-4 py-3 text-sm">
          {t("notifications.notConfigured")}
        </p>
      ) : null}

      <AdminCard
        title={t("notifications.recipients")}
        description={t("notifications.recipientsHint")}
      >
        <ul className="space-y-2.5">
          {emails.map((email, i) => (
            <EmailRow
              key={i}
              index={i}
              value={email}
              onChange={(text) => setEmails((list) => list.map((e, j) => (j === i ? text : e)))}
              onRemove={
                emails.length > 1
                  ? () => setEmails((list) => list.filter((_, j) => j !== i))
                  : undefined
              }
            />
          ))}
        </ul>
        {emails.length < MAX_EMAILS ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEmails((list) => [...list, ""])}
          >
            <Plus />
            {t("notifications.addEmail")}
          </Button>
        ) : null}
      </AdminCard>

      <AdminCard title={t("notifications.staff")}>
        <ToggleRow
          label={t("notifications.newOrder")}
          hint={t("notifications.newOrderHint")}
          checked={v.notifyNewOrder}
          onChange={(on) => setV((p) => ({ ...p, notifyNewOrder: on }))}
        />
        <ToggleRow
          label={t("notifications.lowStock")}
          hint={t("notifications.lowStockHint")}
          checked={v.notifyLowStock}
          onChange={(on) => setV((p) => ({ ...p, notifyLowStock: on }))}
        />
        <Threshold
          value={v.lowStockThreshold}
          onChange={(x) => setV((p) => ({ ...p, lowStockThreshold: x }))}
        />
      </AdminCard>

      <AdminCard title={t("notifications.customers")}>
        <ToggleRow
          label={t("notifications.statusEmails")}
          hint={t("notifications.statusEmailsHint")}
          checked={v.customerStatusEmails}
          onChange={(on) => setV((p) => ({ ...p, customerStatusEmails: on }))}
        />
        <p className="text-xs text-muted-foreground">{t("notifications.alwaysSent")}</p>
      </AdminCard>
    </SettingsShell>
  );
}

function EmailRow({
  index,
  value,
  onChange,
  onRemove,
}: {
  index: number;
  value: string;
  onChange: (v: string) => void;
  onRemove?: () => void;
}) {
  const t = useTranslations("admin.settings");
  const error = useFieldError(`adminEmails.${index}`);
  const id = `admin-email-${index}`;
  return (
    <li>
      <div className="flex items-center gap-2">
        {/* Email addresses read left to right: the icon and the padding share that start. */}
        <div dir="ltr" className="relative min-w-0 flex-1">
          <Mail
            className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={id}
            type="email"
            dir="ltr"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="owner@example.com"
            aria-label={t("notifications.emailLabel", { n: index + 1 })}
            aria-invalid={error ? true : undefined}
            className="ps-10"
            maxLength={254}
          />
        </div>
        {onRemove ? (
          <IconButton label={t("notifications.removeEmail")} onClick={onRemove} danger>
            <X className="size-4" />
          </IconButton>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </li>
  );
}

function Threshold({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations("admin.settings");
  const error = useFieldError("lowStockThreshold");
  return (
    <div className="flex flex-col gap-1.5 sm:max-w-64">
      <label htmlFor="low-stock" className="text-sm font-medium">
        {t("notifications.threshold")}
      </label>
      <UnitInput
        id="low-stock"
        unit={t("notifications.pieces")}
        inputMode="numeric"
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
              .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
              .replace(/\D/g, "")
              .slice(0, 4),
          )
        }
        aria-invalid={error ? true : undefined}
      />
      <p className="text-sm text-muted-foreground">{error ?? t("notifications.thresholdHint")}</p>
    </div>
  );
}
