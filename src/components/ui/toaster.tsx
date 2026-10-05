"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster({ dir }: { dir: "rtl" | "ltr" }) {
  return (
    <Sonner
      dir={dir}
      position="top-center"
      richColors
      closeButton
      toastOptions={{ classNames: { toast: "font-sans !rounded-xl" } }}
    />
  );
}
