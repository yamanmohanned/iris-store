"use client";

import { X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  closeLabel = "Close",
  className,
  children,
  ...props
}: React.ComponentProps<typeof D.Content> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  closeLabel?: string;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed start-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-y-1/2 rounded-2xl bg-surface p-5 shadow-float outline-none data-[state=open]:animate-pop-in ltr:-translate-x-1/2 rtl:translate-x-1/2",
          className,
        )}
        {...props}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <D.Title className="text-lg font-semibold">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-sm text-muted-foreground">
                {description}
              </D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          <D.Close
            className="-m-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted"
            aria-label={closeLabel}
          >
            <X className="size-5" />
          </D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}
