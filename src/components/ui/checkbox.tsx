"use client";

import { Check } from "lucide-react";
import { Checkbox as C, Switch as S } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: React.ComponentProps<typeof C.Root>) {
  return (
    <C.Root
      className={cn(
        "peer inline-flex size-5 shrink-0 items-center justify-center rounded-md border border-input bg-surface transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <C.Indicator>
        <Check className="size-3.5" strokeWidth={3} />
      </C.Indicator>
    </C.Root>
  );
}

export function Switch({ className, ...props }: React.ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-input transition-colors data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <S.Thumb className="block size-5 rounded-full bg-white shadow transition-transform ltr:translate-x-0.5 ltr:data-[state=checked]:translate-x-[1.375rem] rtl:-translate-x-0.5 rtl:data-[state=checked]:-translate-x-[1.375rem]" />
    </S.Root>
  );
}
