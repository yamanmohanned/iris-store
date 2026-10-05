import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium text-foreground", className)} {...props} />;
}

/** Label + control + hint/error with the right aria wiring. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optionalText,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  optionalText?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optionalText ? (
          <span className="ms-1 text-xs font-normal text-muted-foreground">({optionalText})</span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
