import { useCatalog } from '@/data/catalog';

/**
 * روابط التواصل من إعدادات المتجر (لوحة الإدارة ← إعدادات المتجر) — المصدر الوحيد لأرقام وحسابات الدار.
 * كانت الصفحات تحتوي أرقاماً تجريبية ثابتة (بعضها لدولة أخرى) فتذهب رسائل الزبائن إلى رقم خاطئ.
 */
export interface ContactLinks {
  /** رابط واتساب، أو null إن لم يُضبط الرقم */
  whatsapp: (text?: string) => string | null;
  /** رابط اتصال هاتفي */
  phone: string | null;
  /** الرقم للعرض: ‎+964 770 123 4567 */
  phoneDisplay: string | null;
  instagram: string | null;
  instagramHandle: string | null;
}

export function contactLinks(settings: { whatsapp?: string; instagram?: string }): ContactLinks {
  const number = (settings.whatsapp ?? '').replace(/\D/g, '');
  const handle = (settings.instagram ?? '').replace(/^@/, '').trim();
  const display = number ? `+${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6, 9)} ${number.slice(9)}`.trim() : null;
  return {
    whatsapp: (text) => (number ? `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}` : null),
    phone: number ? `tel:+${number}` : null,
    phoneDisplay: display,
    instagram: handle ? `https://instagram.com/${handle}` : null,
    instagramHandle: handle || null,
  };
}

export function useContactLinks(): ContactLinks {
  return contactLinks(useCatalog().settings);
}
