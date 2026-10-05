import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-surface-muted text-muted-foreground",
        primary: "bg-primary-soft text-primary",
        accent: "bg-accent text-accent-foreground",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-[oklch(0.5_0.12_60)]",
        danger: "bg-danger-soft text-danger",
        info: "bg-info-soft text-info",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-xl border bg-surface shadow-card", className)} {...props} />;
}

export function Separator({ className, ...props }: React.ComponentProps<"hr">) {
  return <hr className={cn("border-0 border-t", className)} {...props} />;
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div aria-hidden="true" className={cn("skeleton rounded-md", className)} {...props} />;
}

export function Alert({
  tone = "info",
  className,
  ...props
}: React.ComponentProps<"div"> & { tone?: "info" | "success" | "warning" | "danger" }) {
  const tones = {
    info: "bg-info-soft text-info border-info/20",
    success: "bg-success-soft text-success border-success/20",
    warning: "bg-warning-soft text-[oklch(0.45_0.11_60)] border-warning/30",
    danger: "bg-danger-soft text-danger border-danger/20",
  } as const;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("rounded-lg border px-4 py-3 text-sm leading-relaxed", tones[tone], className)}
      {...props}
    />
  );
}
