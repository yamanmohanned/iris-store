"use client";

import { X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Mobile-first drawer built on Radix Dialog (focus trap, Esc, scroll lock, aria).
 * side="bottom" → bottom sheet (phones); "start"/"end" follow the reading direction.
 */
export const Sheet = D.Root;
export const SheetTrigger = D.Trigger;
export const SheetClose = D.Close;

const sideClasses = {
  bottom:
    "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl pb-safe data-[state=open]:animate-sheet-up data-[state=closed]:animate-sheet-down",
  start:
    "inset-y-0 start-0 h-dvh w-[86vw] max-w-sm data-[state=open]:animate-sheet-in-start data-[state=closed]:animate-sheet-out-start",
  end: "inset-y-0 end-0 h-dvh w-[86vw] max-w-sm data-[state=open]:animate-sheet-in-end data-[state=closed]:animate-sheet-out-end",
} as const;

export function SheetContent({
  side = "bottom",
  title,
  description,
  hideTitle = false,
  closeLabel = "Close",
  className,
  children,
  ...props
}: React.ComponentProps<typeof D.Content> & {
  side?: keyof typeof sideClasses;
  title: React.ReactNode;
  description?: React.ReactNode;
  hideTitle?: boolean;
  closeLabel?: string;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed z-50 flex flex-col bg-surface shadow-float outline-none",
          sideClasses[side],
          className,
        )}
        {...props}
      >
        {side === "bottom" ? (
          <div
            aria-hidden="true"
            className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border"
          />
        ) : null}
        <div
          className={cn(
            "flex items-center justify-between gap-3 px-4 pt-3 pb-2",
            hideTitle && "sr-only",
          )}
        >
          <D.Title className="text-lg font-semibold">{title}</D.Title>
          <D.Close
            className="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted"
            aria-label={closeLabel}
          >
            <X className="size-5" />
          </D.Close>
        </div>
        {description ? (
          <D.Description className="px-4 text-sm text-muted-foreground">
            {description}
          </D.Description>
        ) : (
          <D.Description className="sr-only">{title}</D.Description>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </D.Content>
    </D.Portal>
  );
}
