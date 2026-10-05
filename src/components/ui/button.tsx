import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const buttonCva = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-2 font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform,opacity] duration-150 select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-[1.15em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-strong",
        secondary: "bg-primary-soft text-primary hover:bg-primary/15",
        outline: "border border-input bg-surface text-foreground hover:bg-surface-muted",
        ghost: "text-foreground hover:bg-surface-muted",
        danger: "bg-danger text-white shadow-sm hover:bg-danger/90",
        accent: "bg-accent text-accent-foreground shadow-sm hover:bg-accent/90",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        sm: "h-9 rounded-md px-3 text-sm",
        md: "h-11 rounded-lg px-4 text-[0.95rem]",
        lg: "h-12 rounded-lg px-6 text-base",
        xl: "h-14 rounded-xl px-7 text-base",
        icon: "size-11 rounded-full",
        "icon-sm": "size-9 rounded-full",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

/**
 * Class names for button-styled elements (links, etc.). Unlike raw `cva`, conflicting classes
 * passed via `className` (e.g. a different background) correctly override the variant's.
 */
export function buttonVariants(props?: Parameters<typeof buttonCva>[0]) {
  return cn(buttonCva(props));
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonCva> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  loading = false,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonCva({ variant, size, block }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      type={asChild ? undefined : (type ?? "button")}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <Spinner />
            </span>
          ) : null}
          <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>
            {children}
          </span>
        </>
      )}
    </Comp>
  );
}
