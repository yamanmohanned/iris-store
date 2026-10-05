"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Result = { ok: true; saved: boolean } | { ok: false; needsSignIn?: boolean; message?: string };

/** Heart toggle. Guests get a prompt to sign in (and come back to this page). */
export function WishlistButton({
  productId,
  initialSaved,
  action,
  returnTo,
  className,
}: {
  productId: string;
  initialSaved: boolean;
  action: (productId: string) => Promise<Result>;
  returnTo: string;
  className?: string;
}) {
  const t = useTranslations("wishlist");
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !saved;
    setSaved(next); // optimistic
    startTransition(async () => {
      const result = await action(productId);
      if (result.ok) {
        setSaved(result.saved);
        toast.success(result.saved ? t("added") : t("removed"));
        return;
      }
      setSaved(!next);
      if (result.needsSignIn)
        toast(t("signIn"), {
          action: {
            label: t("signInAction"),
            onClick: () => router.push({ pathname: "/login", query: { next: returnTo } }),
          },
        });
      else if (result.message) toast.error(result.message);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? t("remove") : t("add")}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full border bg-surface transition-colors",
        saved ? "border-danger/30 text-danger" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <Heart
        className={cn("size-[1.1rem] transition-transform", saved && "scale-110 fill-current")}
        aria-hidden="true"
      />
    </button>
  );
}
