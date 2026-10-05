import "server-only";
import { createTranslator } from "next-intl";
import arMessages from "../../../messages/ar.json";
import enMessages from "../../../messages/en.json";
import type { EmailMessage } from "./index";

export type EmailLocale = "ar" | "en";
export type Brand = {
  storeName: string;
  primaryColor: string;
  appUrl: string;
  logoUrl?: string | null;
};

const MESSAGES = { ar: arMessages, en: enMessages } as const;

export function emailT(locale: EmailLocale) {
  return createTranslator({ locale, messages: MESSAGES[locale], namespace: "emails" });
}

export function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Table-based, inline-styled layout that renders consistently in Gmail/Outlook/Apple Mail, RTL-aware. */
export function layout(opts: {
  locale: EmailLocale;
  brand: Brand;
  preheader: string;
  bodyHtml: string;
  footerHtml?: string;
}) {
  const { locale, brand } = opts;
  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = locale === "ar" ? "right" : "left";
  const font = "'Segoe UI', Tahoma, Arial, sans-serif";
  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${esc(brand.storeName)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f3f7;font-family:${font};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f7;padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
    <tr><td style="background:${brand.primaryColor};padding:20px 28px;text-align:${align};">
      <a href="${esc(brand.appUrl)}" style="color:#ffffff;font-size:20px;font-weight:700;text-decoration:none;font-family:${font};">${esc(brand.storeName)}</a>
    </td></tr>
    <tr><td dir="${dir}" style="padding:28px;text-align:${align};color:#22212b;font-size:15px;line-height:1.7;font-family:${font};">
      ${opts.bodyHtml}
    </td></tr>
    <tr><td dir="${dir}" style="padding:18px 28px;background:#faf9fc;color:#7b7987;font-size:12px;line-height:1.6;text-align:${align};font-family:${font};">
      ${opts.footerHtml ?? ""}
      <div>© ${new Date().getFullYear()} ${esc(brand.storeName)}</div>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

export type OtpPurpose = "sign-in" | "email-verification" | "forget-password" | "change-email";

export function otpEmail(opts: {
  to: string;
  locale: EmailLocale;
  brand: Brand;
  code: string;
  purpose: OtpPurpose;
  minutes: number;
}): EmailMessage {
  const t = emailT(opts.locale);
  const purposeKey = {
    "sign-in": "otpSignIn",
    "email-verification": "otpVerify",
    "forget-password": "otpReset",
    "change-email": "otpChangeEmail",
  }[opts.purpose] as "otpSignIn" | "otpVerify" | "otpReset" | "otpChangeEmail";
  const heading = t(`${purposeKey}.heading`);
  const intro = t(`${purposeKey}.intro`);
  const expires = t("otpExpires", { minutes: opts.minutes });
  const ignore = t("otpIgnore");
  const subject = t("otpSubject", { code: opts.code, store: opts.brand.storeName });
  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:20px;color:#22212b;">${esc(heading)}</h1>
    <p style="margin:0 0 20px;">${esc(intro)}</p>
    <div dir="ltr" style="margin:0 0 20px;padding:16px;border-radius:12px;background:#f4f1fd;text-align:center;font-size:32px;font-weight:700;letter-spacing:10px;color:${opts.brand.primaryColor};font-family:Consolas,Menlo,monospace;">${esc(opts.code)}</div>
    <p style="margin:0 0 8px;color:#55535f;">${esc(expires)}</p>
    <p style="margin:0;color:#55535f;">${esc(ignore)}</p>`;
  return {
    to: opts.to,
    subject,
    category: `otp:${opts.purpose}`,
    html: layout({
      locale: opts.locale,
      brand: opts.brand,
      preheader: subject,
      bodyHtml,
      footerHtml: `<div style="margin-bottom:6px;">${esc(t("securityNote"))}</div>`,
    }),
    text: `${heading}\n\n${intro}\n\n${opts.code}\n\n${expires}\n${ignore}`,
  };
}

/** Sent when someone tries to register with an email that already has an account (no enumeration). */
export function existingAccountEmail(opts: {
  to: string;
  locale: EmailLocale;
  brand: Brand;
}): EmailMessage {
  const t = emailT(opts.locale);
  const loginUrl = `${opts.brand.appUrl}${opts.locale === "ar" ? "" : "/en"}/login`;
  const subject = t("existingAccount.subject", { store: opts.brand.storeName });
  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:20px;">${esc(t("existingAccount.heading"))}</h1>
    <p style="margin:0 0 16px;">${esc(t("existingAccount.body"))}</p>
    <p style="margin:0 0 20px;"><a href="${esc(loginUrl)}" style="display:inline-block;background:${opts.brand.primaryColor};color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">${esc(t("existingAccount.cta"))}</a></p>
    <p style="margin:0;color:#55535f;">${esc(t("existingAccount.ignore"))}</p>`;
  return {
    to: opts.to,
    subject,
    category: "existing-account",
    html: layout({ locale: opts.locale, brand: opts.brand, preheader: subject, bodyHtml }),
    text: `${t("existingAccount.heading")}\n\n${t("existingAccount.body")}\n${loginUrl}\n\n${t("existingAccount.ignore")}`,
  };
}
