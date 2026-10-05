"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SettingsResult } from "./shell";

export function ClearCacheButton({ action }: { action: () => Promise<SettingsResult> }) {
  const t = useTranslations("admin.settings.cache");
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await action();
          if (r.ok) toast.success(r.message);
          else toast.error(r.message);
        })
      }
    >
      <RefreshCw />
      {t("button")}
    </Button>
  );
}
