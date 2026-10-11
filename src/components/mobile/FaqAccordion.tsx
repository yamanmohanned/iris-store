import { useId, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import type { FaqItem } from '@/data/faq';
import { cn } from '@/lib/cn';

/** سؤال قابل للطي داخل بطاقة بيضاء (صفحة الأسئلة و«تواصل معنا» على الهاتف). */
export function FaqAccordionItem({ item, defaultOpen }: { item: FaqItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const panelId = useId();
  return (
    <div className="border-b border-hairline-burgundy px-4 last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[52px] w-full items-center justify-between gap-3 py-3 text-right font-label-lg text-label-lg font-semibold leading-snug text-deep-oxblood"
      >
        {item.q}
        <Icon name="expand_more" className={cn('text-[22px] text-antique-gold transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div id={panelId} className="pb-4">
          <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">{item.a}</p>
          {item.link && (
            <Link
              to={item.link.to}
              className="mt-2 inline-flex min-h-[32px] items-center gap-0.5 font-label-md text-label-md font-semibold text-antique-gold"
            >
              {item.link.label}
              <Icon name="chevron_left" className="text-[18px]" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
