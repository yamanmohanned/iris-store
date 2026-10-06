import { cn } from "@/lib/utils";

export type BlockType = "hero" | "categories" | "products" | "banner" | "features" | "text";

const line = "block h-1 rounded-full bg-current opacity-35";

/** A tiny wireframe of how each home block looks, so owners recognize blocks at a glance. */
export function BlockThumb({ type, className }: { type: BlockType; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-12 w-16 shrink-0 flex-col justify-center gap-1 overflow-hidden rounded-lg border bg-surface p-1.5 text-primary",
        className,
      )}
    >
      {type === "hero" ? (
        <>
          <span className="flex flex-1 flex-col justify-end gap-0.5 rounded bg-primary/15 p-1">
            <span className={cn(line, "w-3/4")} />
            <span className="block h-1.5 w-5 rounded-full bg-primary/70" />
          </span>
          <span className="flex justify-center gap-0.5">
            <span className="size-1 rounded-full bg-primary/70" />
            <span className="size-1 rounded-full bg-primary/25" />
            <span className="size-1 rounded-full bg-primary/25" />
          </span>
        </>
      ) : type === "categories" ? (
        <span className="flex justify-between">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="flex flex-col items-center gap-0.5">
              <span className="size-2.5 rounded-full bg-primary/25" />
              <span className={cn(line, "w-2")} />
            </span>
          ))}
        </span>
      ) : type === "products" ? (
        <span className="grid grid-cols-4 gap-0.5">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="flex flex-col gap-0.5">
              <span className="h-4 rounded-sm bg-primary/20" />
              <span className={cn(line, "w-full")} />
            </span>
          ))}
        </span>
      ) : type === "banner" ? (
        <span className="flex h-full items-center gap-1 rounded bg-primary/70 px-1.5">
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="block h-1 w-3/4 rounded-full bg-white/80" />
            <span className="block h-1 w-1/2 rounded-full bg-white/50" />
          </span>
        </span>
      ) : type === "features" ? (
        <span className="flex justify-between">
          {[0, 1, 2].map((i) => (
            <span key={i} className="flex flex-col items-center gap-0.5">
              <span className="size-2.5 rounded-md border border-current opacity-60" />
              <span className={cn(line, "w-3")} />
            </span>
          ))}
        </span>
      ) : (
        <span className="flex flex-col items-center gap-1">
          <span className={cn(line, "w-10")} />
          <span className={cn(line, "w-12")} />
          <span className={cn(line, "w-8")} />
        </span>
      )}
    </span>
  );
}
