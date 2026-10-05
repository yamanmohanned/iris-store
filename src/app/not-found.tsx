import Link from "next/link";
import "./globals.css";

// Fallback for paths outside the localized tree (e.g. unknown files). Bilingual on purpose.
export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body className="flex min-h-dvh items-center justify-center p-6 text-center">
        <div>
          <p className="text-6xl font-bold text-primary">404</p>
          <p className="mt-4 text-lg">الصفحة غير موجودة · Page not found</p>
          <Link href="/" className="mt-6 inline-block text-primary underline">
            الرئيسية · Home
          </Link>
        </div>
      </body>
    </html>
  );
}
