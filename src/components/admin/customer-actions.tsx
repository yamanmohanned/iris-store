"use client";

import { Ban, LogOut, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";

type Result = { ok: boolean; message?: string };

/** Account controls on the customer page (suspend with a reason, reactivate, sign out). */
export function CustomerActions({
  userId,
  banned,
  banReason,
  activeSessions,
  canWrite,
  suspend,
  signOut,
}: {
  userId: string;
  banned: boolean;
  banReason: string | null;
  activeSessions: number;
  canWrite: boolean;
  suspend: (userId: string, suspended: boolean, reason: string | null) => Promise<Result>;
  signOut: (userId: string) => Promise<Result>;
}) {
  const t = useTranslations("admin.customers");
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (r.message) toast.success(r.message);
        after?.();
      } else if (r.message) toast.error(r.message);
    });

  return (
    <section className="space-y-3 rounded-2xl border bg-surface p-4 shadow-card">
      <h2 className="font-semibold">{t("account")}</h2>
      {banned ? (
        <div className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm">
          <p className="font-medium text-danger">{t("isSuspended")}</p>
          {banReason ? <p className="mt-0.5">{t("reason", { reason: banReason })}</p> : null}
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">{t("sessions", { count: activeSessions })}</p>
      {canWrite ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pending || activeSessions === 0}
            onClick={() => run(() => signOut(userId))}
          >
            <LogOut />
            {t("signOutAll")}
          </Button>
          {banned ? (
            <Button
              variant="outline"
              size="sm"
              loading={pending}
              onClick={() => run(() => suspend(userId, false, null))}
            >
              <RotateCcw />
              {t("reactivate")}
            </Button>
          ) : !asking ? (
            <Button variant="outline" size="sm" onClick={() => setAsking(true)}>
              <Ban />
              {t("suspend")}
            </Button>
          ) : null}
        </div>
      ) : null}
      {canWrite && asking && !banned ? (
        <div className="space-y-3 rounded-xl border p-3">
          <p className="text-sm">{t("suspendExplain")}</p>
          <Field label={t("suspendReason")} htmlFor="suspend-reason" hint={t("suspendReasonHint")}>
            <Textarea
              id="suspend-reason"
              rows={2}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              loading={pending}
              onClick={() =>
                run(
                  () => suspend(userId, true, reason.trim() || null),
                  () => {
                    setAsking(false);
                    setReason("");
                  },
                )
              }
            >
              {t("confirmSuspend")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAsking(false)}>
              {tCommon("cancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
