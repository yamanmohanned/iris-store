"use client";

import { Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

/** Native share sheet on phones; copies the link elsewhere. */
export function ShareButton({ title }: { title: string }) {
  const t = useTranslations("store.product");
  return (
    <button
      type="button"
      onClick={async () => {
        const url = window.location.href;
        if (navigator.share) {
          await navigator.share({ title, url }).catch(() => undefined);
        } else {
          await navigator.clipboard.writeText(url);
          toast.success(url);
        }
      }}
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border bg-surface text-muted-foreground hover:text-foreground"
      aria-label={t("share")}
    >
      <Share2 className="size-4" />
    </button>
  );
}
