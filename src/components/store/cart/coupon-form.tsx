"use client";

import { TicketPercent, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/forms/form-controls";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/form-state";
import { cn } from "@/lib/utils";
import type { CartActionResult } from "@/server/services/cart";

/**
 * Coupon entry. With a code on the cart it becomes a chip (with the reason when the code does not
 * apply right now, e.g. a minimum not reached yet) and a remove button.
 */
export function CouponForm({
  applied,
  note,
  noteTone = "muted",
  applyAction,
  removeAction,
}: {
  applied: string | null;
  note?: string | null;
  noteTone?: "muted" | "warning" | "success";
  applyAction: (prev: FormState, form: FormData) => Promise<FormState>;
  removeAction: () => Promise<CartActionResult>;
}) {
  const t = useTranslations("cart.coupon");
  const [state, formAction] = useActionState(applyAction, null);
  const [removing, startRemove] = useTransition();
  const lastState = useRef<FormState>(null);

  useEffect(() => {
    if (!state || state === lastState.current) return;
    lastState.current = state;
    if (state.ok && state.message) {
      if (state.data?.info) toast.info(state.message);
      else toast.success(state.message);
    } else if (!state.ok && state.message) toast.error(state.message);
  }, [state]);

  if (applied) {
    return (
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary-soft/60 p-3">
        <div className="flex items-center gap-2">
          <TicketPercent className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted-foreground">{t("label")}</span>
            <bdi dir="ltr" className="font-mono text-sm font-semibold tracking-wide">
              {applied}
            </bdi>
          </span>
          <button
            type="button"
            onClick={() =>
              startRemove(async () => {
                const r = await removeAction();
                if (r.ok) toast.success(t("removed"));
              })
            }
            disabled={removing}
            aria-label={t("remove")}
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        {note ? (
          <p
            className={cn(
              "mt-2 text-xs",
              noteTone === "warning" && "text-warning",
              noteTone === "success" && "text-success",
              noteTone === "muted" && "text-muted-foreground",
            )}
          >
            {note}
          </p>
        ) : null}
      </div>
    );
  }

  const error = state && !state.ok ? state.fieldErrors?.code : undefined;
  return (
    <form action={formAction} className="space-y-1.5" noValidate>
      <label htmlFor="coupon-code" className="text-sm font-medium">
        {t("label")}
      </label>
      <div className="flex gap-2">
        <Input
          id="coupon-code"
          name="code"
          defaultValue={state?.values?.code ?? ""}
          placeholder={t("placeholder")}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          dir="ltr"
          maxLength={40}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "coupon-error" : undefined}
          className="h-11 flex-1 font-mono uppercase placeholder:font-sans placeholder:normal-case"
        />
        <SubmitButton variant="secondary" className="h-11 shrink-0">
          {t("apply")}
        </SubmitButton>
      </div>
      {error ? (
        <p id="coupon-error" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
