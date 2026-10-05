"use client";

import { Check, Copy, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { FormAlert, SubmitButton } from "@/components/forms/form-controls";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import type { FormState } from "@/lib/form-state";
import { ORDER_FLOW, STATUS_TRANSITIONS, type OrderStatusValue } from "@/lib/order-status";

type Result = { ok: boolean; message?: string };
type StatusInput = {
  orderId: string;
  from: OrderStatusValue;
  to: OrderStatusValue;
  reason?: string;
  notifyCustomer?: boolean;
};
type PaymentStatusValue = "unpaid" | "paid" | "refunded" | "partially_refunded";

/** The allowed next steps for this order: the forward move is primary, cancel/return need a reason. */
export function OrderStatusActions({
  orderId,
  orderNumber,
  status,
  hasEmail,
  canWrite,
  action,
}: {
  orderId: string;
  orderNumber: number;
  status: OrderStatusValue;
  hasEmail: boolean;
  canWrite: boolean;
  action: (input: StatusInput) => Promise<Result>;
}) {
  const t = useTranslations("admin.orders.detail");
  const [pending, start] = useTransition();
  const [notify, setNotify] = useState(hasEmail);
  const [dialog, setDialog] = useState<"cancelled" | "returned" | null>(null);
  const [reason, setReason] = useState("");
  const next = STATUS_TRANSITIONS[status];
  if (!canWrite || next.length === 0) return null;
  const forward = next.filter((s) => (ORDER_FLOW as readonly string[]).includes(s));
  const primary = forward[0];

  function run(to: OrderStatusValue, why?: string) {
    start(async () => {
      const r = await action({ orderId, from: status, to, reason: why, notifyCustomer: notify });
      if (r.ok) {
        toast.success(r.message ?? t("updated"));
        setDialog(null);
        setReason("");
      } else toast.error(r.message ?? "");
    });
  }

  return (
    <section
      className="rounded-2xl border bg-surface p-4 shadow-card print:hidden"
      aria-label={t("nextStep")}
    >
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{t("nextStep")}</h2>
      <div className="flex flex-wrap gap-2">
        {primary ? (
          <Button
            size="lg"
            onClick={() => run(primary)}
            loading={pending}
            className="flex-1 sm:flex-none"
          >
            <Check />
            {t(`actions.${primary}` as "actions.confirmed")}
          </Button>
        ) : null}
        {forward.slice(1).map((s) => (
          <Button key={s} variant="outline" size="lg" onClick={() => run(s)} disabled={pending}>
            {t(`actions.${s}` as "actions.confirmed")}
          </Button>
        ))}
        {next.includes("cancelled") ? (
          <Button
            variant="ghost"
            size="lg"
            className="text-danger hover:bg-danger-soft"
            onClick={() => setDialog("cancelled")}
            disabled={pending}
          >
            {t("actions.cancelled")}
          </Button>
        ) : null}
        {next.includes("returned") ? (
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setDialog("returned")}
            disabled={pending}
          >
            {t("actions.returned")}
          </Button>
        ) : null}
      </div>
      {hasEmail ? (
        <label className="mt-3 flex items-center gap-2.5 text-sm">
          <Checkbox checked={notify} onCheckedChange={(c) => setNotify(c === true)} />
          {t("notify")}
        </label>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">{t("noEmail")}</p>
      )}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        {dialog ? (
          <DialogContent
            title={
              dialog === "cancelled"
                ? t("cancelTitle", { number: orderNumber })
                : t("returnTitle", { number: orderNumber })
            }
            description={dialog === "cancelled" ? t("cancelHint") : t("returnHint")}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(dialog, reason.trim() || undefined);
              }}
              className="space-y-4"
            >
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">{t("cancelReason")}</span>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={300}
                  required={dialog === "cancelled"}
                  placeholder={t("cancelReasonPlaceholder")}
                  autoFocus
                />
              </label>
              <Button
                type="submit"
                variant={dialog === "cancelled" ? "danger" : "primary"}
                block
                size="lg"
                loading={pending}
                disabled={dialog === "cancelled" && !reason.trim()}
              >
                {dialog === "cancelled" ? t("confirmCancel") : t("confirmReturn")}
              </Button>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}

const PAYMENT_MOVES: Record<PaymentStatusValue, PaymentStatusValue[]> = {
  unpaid: ["paid"],
  paid: ["unpaid", "refunded", "partially_refunded"],
  partially_refunded: ["refunded", "paid"],
  refunded: ["paid"],
};

export function PaymentActions({
  orderId,
  status,
  canWrite,
  action,
}: {
  orderId: string;
  status: PaymentStatusValue;
  canWrite: boolean;
  action: (input: {
    orderId: string;
    from: PaymentStatusValue;
    to: PaymentStatusValue;
  }) => Promise<Result>;
}) {
  const t = useTranslations("admin.orders.detail");
  const [pending, start] = useTransition();
  if (!canWrite) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2 print:hidden">
      {PAYMENT_MOVES[status].map((to) => (
        <Button
          key={to}
          size="sm"
          variant={to === "paid" ? "secondary" : "ghost"}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await action({ orderId, from: status, to });
              if (r.ok) toast.success(r.message ?? t("updated"));
              else toast.error(r.message ?? "");
            })
          }
        >
          {t(`paymentActions.${to}`)}
        </Button>
      ))}
    </div>
  );
}

function useToastOnSuccess(state: FormState, after?: () => void) {
  const seen = useRef<FormState>(null);
  useEffect(() => {
    if (!state || state === seen.current) return;
    seen.current = state;
    if (state.ok && state.message) {
      toast.success(state.message);
      after?.();
    }
  }, [state, after]);
}

export function AddNoteForm({
  orderId,
  action,
}: {
  orderId: string;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("admin.orders.detail");
  const [state, formAction] = useActionState(action, null);
  useToastOnSuccess(state);
  return (
    <form action={formAction} className="space-y-2.5 border-t p-4 print:hidden">
      <input type="hidden" name="orderId" value={orderId} />
      <FormAlert state={state?.ok ? null : state} />
      <Textarea
        name="message"
        rows={2}
        maxLength={1000}
        required
        placeholder={t("notePlaceholder")}
        aria-label={t("addNote")}
        defaultValue={state && !state.ok ? state.values?.message : ""}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs">
          <Checkbox name="customerVisible" />
          {t("showToCustomer")}
        </label>
        <SubmitButton size="sm" variant="secondary">
          {t("addNote")}
        </SubmitButton>
      </div>
    </form>
  );
}

export function InternalNoteForm({
  orderId,
  note,
  action,
}: {
  orderId: string;
  note: string | null;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("admin.orders.detail");
  const [state, formAction] = useActionState(action, null);
  useToastOnSuccess(state);
  return (
    <form action={formAction} className="space-y-2 print:hidden">
      <input type="hidden" name="orderId" value={orderId} />
      <Textarea
        name="note"
        rows={3}
        maxLength={2000}
        defaultValue={state?.values?.note ?? note ?? ""}
        aria-label={t("internalNote")}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t("internalNoteHint")}</p>
        <SubmitButton size="sm" variant="secondary">
          {t("saveNote")}
        </SubmitButton>
      </div>
    </form>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const t = useTranslations("admin.orders.detail");
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          toast.success(t("copied"));
          window.setTimeout(() => setDone(false), 1500);
        } catch {
          window.prompt(label, text);
        }
      }}
    >
      {done ? <Check /> : <Copy />}
      {label}
    </Button>
  );
}

export function PrintButton() {
  const t = useTranslations("admin.orders.detail");
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className="print:hidden"
    >
      <Printer />
      {t("print")}
    </Button>
  );
}
