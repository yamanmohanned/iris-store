import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { runLegacy } from '@/lib/legacy';
import { useToast } from '@/state/toast';

/**
 * تفويض أحداث واحد للتطبيق كله لمعالجات `data-legacy-on*` (انظر lib/legacy.ts):
 *  - click   → ينفّذ الأمر المضمّن
 *  - change/input → للحقول التي كانت تملك onchange
 *  - submit  → يمنع الإرسال الفعلي للنماذج التجريبية
 */
export function LegacyHandlers() {
  const navigate = useNavigate();
  const { show } = useToast();
  const svc = useRef({ toast: show, back: () => navigate(-1) });
  svc.current = { toast: show, back: () => navigate(-1) };

  useEffect(() => {
    const dispatch = (attr: string) => (e: Event) => {
      const origin = e.target as Element | null;
      const el = origin?.closest?.(`[${attr}]`) as HTMLElement | null;
      if (!el) return;
      const code = el.getAttribute(attr);
      if (code) runLegacy(code, el, svc.current);
    };

    const onClick = dispatch('data-legacy-onclick');
    const onChange = dispatch('data-legacy-onchange');
    const onInput = dispatch('data-legacy-oninput');
    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement | null;
      if (form?.hasAttribute('data-legacy-onsubmit')) {
        e.preventDefault();
        const code = form.getAttribute('data-legacy-onsubmit');
        if (code) runLegacy(code, form, svc.current);
      }
    };

    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.addEventListener('submit', onSubmit);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('change', onChange);
      document.removeEventListener('input', onInput);
      document.removeEventListener('submit', onSubmit);
    };
  }, []);

  return null;
}
