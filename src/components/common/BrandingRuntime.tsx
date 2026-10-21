import { useEffect } from 'react';
import { BRANDING_BOOT_KEY, brandingCss } from '@/lib/branding';
import { useBranding } from './BrandLogo';

/**
 * يطبّق هوية المتجر على الصفحة كلها: خطوط النصوص والعناوين (متغيرات CSS) وأيقونة المتصفح.
 * ويحفظ نسخة صغيرة يقرؤها index.html عند الفتح التالي حتى لا يظهر الافتراضي لحظة.
 */
export function BrandingRuntime() {
  const branding = useBranding();

  useEffect(() => {
    const css = brandingCss(branding);
    let style = document.getElementById('iris-branding') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'iris-branding';
      document.head.appendChild(style);
    }
    style.textContent = css;

    for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]')) {
      link.dataset.default ??= link.getAttribute('href') ?? '';
      link.href = branding.logo || link.dataset.default;
    }

    try {
      if (css || branding.logo)
        localStorage.setItem(BRANDING_BOOT_KEY, JSON.stringify({ css, logo: branding.logo ?? '', tint: Boolean(branding.logoTint) }));
      else localStorage.removeItem(BRANDING_BOOT_KEY);
    } catch {
      // التخزين المحلي غير متاح (تصفح خاص): لا شيء يُفقد سوى ومضة الشعار الافتراضي عند الفتح
    }
  }, [branding]);

  return null;
}
