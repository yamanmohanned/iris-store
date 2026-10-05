"use client";

import Script from "next/script";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

/**
 * Cloudflare Turnstile bot check (explicit render, works with client-side navigation).
 * The widget injects a hidden "cf-turnstile-response" field into the surrounding form.
 */
export function Turnstile({
  siteKey,
  nonce,
  action,
}: {
  siteKey: string;
  nonce?: string;
  action?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const [ready, setReady] = useState(
    () =>
      typeof window !== "undefined" &&
      Boolean((window as unknown as { turnstile?: TurnstileApi }).turnstile),
  );

  useEffect(() => {
    const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
    if (!ready || !api || !ref.current) return;
    const id = api.render(ref.current, {
      sitekey: siteKey,
      action,
      language: locale,
      size: "flexible",
      theme: "light",
    });
    return () => api.remove(id);
  }, [ready, siteKey, action, locale]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        nonce={nonce}
        onReady={() => setReady(true)}
      />
      <div ref={ref} className="min-h-[65px]" />
    </>
  );
}
