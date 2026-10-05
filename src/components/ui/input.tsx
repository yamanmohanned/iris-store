import * as React from "react";
import { cn } from "@/lib/utils";

export const fieldBase =
  "w-full rounded-lg border border-input bg-surface px-3.5 text-foreground shadow-xs transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/25";

export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return <input type={type} className={cn(fieldBase, "h-12", className)} {...props} />;
}

export function Textarea({ className, rows = 4, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      rows={rows}
      className={cn(fieldBase, "min-h-24 py-3 leading-relaxed", className)}
      {...props}
    />
  );
}

/** Native select: the best picker UX on phones (OS wheel / sheet). */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(fieldBase, "h-12 appearance-none pe-10", className)} {...props}>
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        fill="currentColor"
      >
        <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
      </svg>
    </div>
  );
}
