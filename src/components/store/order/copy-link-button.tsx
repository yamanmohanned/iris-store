"use client";

import { Check, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Copies the current page address (the private order link) so guests can come back to it. */
export function CopyLinkButton() {
  const t = useTranslations("order");
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        const url = window.location.href.split("?")[0]!;
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          toast.success(t("linkCopied"));
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt(t("copyLink"), url);
        }
      }}
    >
      {copied ? <Check /> : <Link2 />}
      {t("copyLink")}
    </Button>
  );
}
