"use client";

import { Direction } from "radix-ui";
import type { ReactNode } from "react";

/** Client-side context providers shared by every page. */
export function Providers({ dir, children }: { dir: "rtl" | "ltr"; children: ReactNode }) {
  return <Direction.Provider dir={dir}>{children}</Direction.Provider>;
}
