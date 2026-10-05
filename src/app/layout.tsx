import type { ReactNode } from "react";

// Pass-through root layout: <html> is rendered by app/[locale]/layout.tsx so that
// `lang` and `dir` follow the active locale.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
