"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();
  useEffect(() => {
    // The digest links this to the server log entry without exposing details to the user.
    if (error.digest) console.error("error digest:", error.digest);
  }, [error]);

  return (
    <main className="container-page flex min-h-[70dvh] flex-col items-center justify-center py-16 text-center">
      <h1 className="text-2xl font-semibold">{t("errors.genericTitle")}</h1>
      <p className="mt-2 max-w-md text-muted-foreground">{t("errors.genericBody")}</p>
      {error.digest ? (
        <p className="mt-2 text-xs text-muted-foreground tabular">#{error.digest}</p>
      ) : null}
      <Button className="mt-8" onClick={reset}>
        {t("common.retry")}
      </Button>
    </main>
  );
}
