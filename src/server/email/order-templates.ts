import "server-only";
import { tl } from "@/lib/localized";
import { formatMoney, type CurrencyConfig } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import type { OrderDTO } from "@/server/services/orders";
import type { EmailMessage } from "./index";
import { emailT, esc, layout, type Brand, type EmailLocale } from "./templates";

const MUTED = "#6b6977";
const LINE = "#ecebf1";

function button(href: string, label: string, color: string) {
  return `<a href="${esc(href)}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">${esc(label)}</a>`;
}

function itemsTable(order: OrderDTO, locale: EmailLocale, currency: CurrencyConfig) {
  const align = locale === "ar" ? "left" : "right";
  const rows = order.items
    .map((item) => {
      const name = esc(tl(item.productName, locale));
      const label = item.variantLabel ? esc(tl(item.variantLabel, locale)) : "";
      const img = item.imageUrl
        ? `<img src="${esc(item.imageUrl)}" width="52" height="64" alt="" style="display:block;width:52px;height:64px;object-fit:cover;border-radius:8px;background:#f4f3f7;">`
        : "";
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${LINE};width:60px;vertical-align:top;">${img}</td>
        <td style="padding:10px 8px;border-bottom:1px solid ${LINE};vertical-align:top;">
          <div style="font-weight:600;">${name}</div>
          ${label ? `<div style="color:${MUTED};font-size:13px;">${label}</div>` : ""}
          <div style="color:${MUTED};font-size:13px;">× ${item.quantity}</div>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid ${LINE};vertical-align:top;text-align:${align};white-space:nowrap;" dir="ltr">${esc(formatMoney(item.lineTotal, currency, locale))}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">${rows}</table>`;
}

function totalsTable(order: OrderDTO, locale: EmailLocale, currency: CurrencyConfig) {
  const t = emailT(locale);
  const align = locale === "ar" ? "left" : "right";
  const money = (n: number) => esc(formatMoney(n, currency, locale));
  const row = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:4px 0;${strong ? "font-weight:700;font-size:16px;" : `color:${MUTED};`}">${esc(label)}</td><td dir="ltr" style="padding:4px 0;text-align:${align};${strong ? "font-weight:700;font-size:16px;" : ""}">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
    ${row(t("order.subtotal"), money(order.subtotal))}
    ${order.discountTotal ? row(t("order.discount"), `−${money(order.discountTotal)}`) : ""}
    ${row(t("order.shipping"), order.shippingTotal ? money(order.shippingTotal) : esc(t("order.free")))}
    ${row(t("order.total"), money(order.grandTotal), true)}
  </table>`;
}

function addressBlock(order: OrderDTO, locale: EmailLocale) {
  const a = order.shippingAddress;
  const parts = [tl(a.zoneName, locale), a.city, a.area, a.street, a.landmark].filter(Boolean);
  return `${esc(a.fullName)}<br><span dir="ltr">${esc(formatPhone(a.phone))}</span><br>${parts.map((p) => esc(String(p))).join("، ")}`;
}

/** Customer: "We received your order #10001". */
export function orderPlacedEmail(opts: {
  to: string;
  locale: EmailLocale;
  brand: Brand;
  order: OrderDTO;
  currency: CurrencyConfig;
  orderUrl: string;
  bankInstructions?: string;
}): EmailMessage {
  const { order, locale, brand, currency } = opts;
  const t = emailT(locale);
  const subject = t("order.placedSubject", { number: order.orderNumber, store: brand.storeName });
  const payment =
    order.paymentMethod === "cod" ? t("order.paymentCod") : t("order.paymentBankTransfer");
  const bodyHtml = `
    <h1 style="margin:0 0 8px;font-size:20px;">${esc(t("order.placedHeading", { name: order.customerName.split(" ")[0] ?? "" }))}</h1>
    <p style="margin:0 0 6px;">${esc(t("order.placedIntro"))}</p>
    <p style="margin:0 0 20px;color:${MUTED};">${esc(t("order.number", { number: order.orderNumber }))}</p>
    ${itemsTable(order, locale, currency)}
    ${totalsTable(order, locale, currency)}
    <p style="margin:0 0 4px;font-weight:600;">${esc(t("order.deliverTo"))}</p>
    <p style="margin:0 0 16px;color:#3a3846;">${addressBlock(order, locale)}</p>
    <p style="margin:0 0 4px;font-weight:600;">${esc(t("order.payment"))}</p>
    <p style="margin:0 0 ${opts.bankInstructions ? "8" : "20"}px;color:#3a3846;">${esc(payment)}</p>
    ${opts.bankInstructions ? `<p style="margin:0 0 20px;padding:12px;border-radius:10px;background:#f4f1fd;white-space:pre-line;">${esc(opts.bankInstructions)}</p>` : ""}
    <p style="margin:0 0 8px;">${button(opts.orderUrl, t("order.viewOrder"), brand.primaryColor)}</p>`;
  return {
    to: opts.to,
    subject,
    category: "order:placed",
    html: layout({ locale, brand, preheader: t("order.placedIntro"), bodyHtml }),
    text: [
      t("order.placedHeading", { name: order.customerName }),
      t("order.placedIntro"),
      t("order.number", { number: order.orderNumber }),
      "",
      ...order.items.map(
        (i) =>
          `• ${tl(i.productName, locale)} × ${i.quantity} — ${formatMoney(i.lineTotal, currency, locale)}`,
      ),
      "",
      `${t("order.total")}: ${formatMoney(order.grandTotal, currency, locale)}`,
      `${t("order.payment")}: ${payment}`,
      opts.bankInstructions ?? "",
      "",
      opts.orderUrl,
    ].join("\n"),
  };
}

/** Owner/staff: new order alert with what is needed to call the customer and pack it. */
export function adminNewOrderEmail(opts: {
  to: string;
  brand: Brand;
  order: OrderDTO;
  currency: CurrencyConfig;
  adminUrl: string;
}): EmailMessage {
  const locale: EmailLocale = "ar";
  const { order, brand, currency } = opts;
  const t = emailT(locale);
  const total = formatMoney(order.grandTotal, currency, locale);
  const subject = t("order.adminSubject", { number: order.orderNumber, total });
  const bodyHtml = `
    <h1 style="margin:0 0 8px;font-size:20px;">${esc(t("order.adminHeading", { number: order.orderNumber }))}</h1>
    <p style="margin:0 0 16px;color:#3a3846;">${addressBlock(order, locale)}</p>
    ${itemsTable(order, locale, currency)}
    ${totalsTable(order, locale, currency)}
    ${order.customerNote ? `<p style="margin:0 0 16px;padding:12px;border-radius:10px;background:#fff8e1;">${esc(order.customerNote)}</p>` : ""}
    <p style="margin:0;">${button(opts.adminUrl, t("order.openInAdmin"), brand.primaryColor)}</p>`;
  return {
    to: opts.to,
    subject,
    category: "order:admin-new",
    html: layout({ locale, brand, preheader: subject, bodyHtml }),
    text: `${subject}\n${order.customerName} ${order.customerPhone}\n${opts.adminUrl}`,
  };
}

export function adminLowStockEmail(opts: {
  to: string;
  brand: Brand;
  items: { name: string; stock: number }[];
  adminUrl: string;
}): EmailMessage {
  const t = emailT("ar");
  const subject = t("order.lowStockSubject", { count: opts.items.length });
  const list = opts.items
    .map(
      (i) =>
        `<li style="margin:0 0 6px;">${esc(i.name)} — <strong>${esc(t("order.remaining", { count: i.stock }))}</strong></li>`,
    )
    .join("");
  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:20px;">${esc(t("order.lowStockHeading"))}</h1>
    <ul style="margin:0 0 20px;padding-inline-start:20px;">${list}</ul>
    <p style="margin:0;">${button(opts.adminUrl, t("order.openInAdmin"), opts.brand.primaryColor)}</p>`;
  return {
    to: opts.to,
    subject,
    category: "inventory:low-stock",
    html: layout({ locale: "ar", brand: opts.brand, preheader: subject, bodyHtml }),
    text: `${subject}\n${opts.items.map((i) => `• ${i.name}: ${i.stock}`).join("\n")}\n${opts.adminUrl}`,
  };
}
