"use client";

import "./globals.css";

// Last-resort boundary (errors thrown by the root layout itself). Must render <html>.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="flex min-h-dvh items-center justify-center p-6 text-center">
        <div>
          <p className="text-xl font-semibold">حدث خطأ غير متوقع · Something went wrong</p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-lg bg-primary px-5 py-3 text-primary-foreground"
          >
            إعادة المحاولة · Try again
          </button>
        </div>
      </body>
    </html>
  );
}
