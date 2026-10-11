import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { useContactLinks } from '@/lib/contact';

/**
 * رابط واتساب الدار من إعدادات المتجر. إن لم يضبط المالك الرقم بعد يصبح رابطاً لصفحة «تواصل معنا»
 * بدل رقم تجريبي لا يملكه أحد.
 */
export function WhatsAppLink({
  text,
  className,
  style,
  children,
  'aria-label': ariaLabel,
}: {
  /** نص الرسالة الجاهز */
  text?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  'aria-label'?: string;
}) {
  const href = useContactLinks().whatsapp(text ?? 'مرحباً دار آيريس، لدي استفسار');
  if (!href) {
    return (
      <Link to="/contact" className={className} style={style} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className} style={style} aria-label={ariaLabel}>
      {children}
    </a>
  );
}
