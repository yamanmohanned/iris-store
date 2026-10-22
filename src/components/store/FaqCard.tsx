import { useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import type { FaqItem } from '@/data/faq';
import { cn } from '@/lib/cn';

/** سؤال قابل للطي بتصميم الديسكتوب (صفحة الأسئلة الشائعة وقسم الأسئلة في الرئيسية). */
export function FaqCard({ item, defaultOpen }: { item: FaqItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_8px_30px_rgba(42,3,13,0.05)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-full p-space-lg text-right flex items-center justify-between gap-space-md hover:bg-blush-surface/40 transition-colors"
      >
        <span className={cn('font-headline-sm text-headline-sm font-medium', open ? 'text-primary' : 'text-on-surface')}>{item.q}</span>
        <span
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300',
            open ? 'bg-blush-surface text-primary rotate-180' : 'bg-surface-container text-muted-rosewood',
          )}
        >
          <Icon name="keyboard_arrow_down" className="text-xl" />
        </span>
      </button>
      {open && (
        <div className="px-space-lg pb-space-lg">
          <div className="pt-space-sm border-t border-hairline-burgundy/50">
            <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">{item.a}</p>
            {item.link && (
              <Link
                to={item.link.to}
                className="mt-space-sm inline-flex items-center gap-1 font-label-lg text-label-lg font-semibold text-antique-gold hover:text-primary"
              >
                {item.link.label}
                <Icon name="chevron_left" className="text-[18px]" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
