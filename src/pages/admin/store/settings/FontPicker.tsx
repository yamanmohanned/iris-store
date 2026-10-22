import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { FONT_PRESETS, isPresetFont, presetFamily, type CustomFont, type FontRef } from '@/lib/branding';
import { cn } from '@/lib/cn';
import { uploadFont } from '@/lib/image';
import { useToast } from '@/state/toast';

const SAMPLE = 'التفاصيل تصنع الفرق';

/**
 * يسجّل خطاً مرفوعاً في المتصفح باسم مؤقت للمعاينة قبل الحفظ، ويعيد اسم العائلة الجاهز للاستخدام.
 * الخطوط المحفوظة يطبّقها BrandingRuntime على الموقع كله.
 */
export function usePreviewFamily(font: FontRef | undefined, fallback: FontRef, key: string): string {
  const f = font ?? fallback;
  const custom = isPresetFont(f) ? null : f;
  const family = `IrisPreview${key}`;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!custom) return;
    const faces = [
      new FontFace(family, `url(${JSON.stringify(custom.regular)})`, { weight: custom.bold ? '100 500' : '100 900' }),
      ...(custom.bold ? [new FontFace(family, `url(${JSON.stringify(custom.bold)})`, { weight: '600 900' })] : []),
    ];
    let alive = true;
    setReady(false);
    Promise.all(faces.map((face) => face.load()))
      .then((loaded) => {
        if (!alive) return;
        loaded.forEach((face) => document.fonts.add(face));
        setReady(true);
      })
      .catch(() => alive && setReady(false));
    return () => {
      alive = false;
      faces.forEach((face) => document.fonts.delete(face));
    };
  }, [custom?.regular, custom?.bold, family]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isPresetFont(f)) return `'${presetFamily(f.preset)}', 'IBM Plex Sans Arabic', sans-serif`;
  return ready ? `'${family}', 'IBM Plex Sans Arabic', sans-serif` : `'IBM Plex Sans Arabic', sans-serif`;
}

/** اختيار خط: من الخطوط المرفقة، أو رفع ملف خط من الجهاز (عادي + عريض اختياري). */
export function FontPicker({
  title,
  hint,
  value,
  fallback,
  previewKey,
  onChange,
}: {
  title: string;
  hint: string;
  value: FontRef | undefined;
  fallback: FontRef;
  previewKey: string;
  onChange: (f: FontRef) => void;
}) {
  const current = value ?? fallback;
  const custom = isPresetFont(current) ? null : current;
  const customFamily = usePreviewFamily(custom ?? undefined, fallback, `${previewKey}Picker`);

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h4 className="font-label-lg text-label-lg font-semibold text-warm-ink">{title}</h4>
        <p className="font-label-sm text-label-sm text-muted-rosewood">{hint}</p>
      </div>
      <div role="radiogroup" aria-label={title} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {FONT_PRESETS.map((p) => {
          const on = isPresetFont(current) && current.preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange({ preset: p.id })}
              className={cn(
                'flex flex-col items-start gap-1 rounded-xl p-3 text-right transition-colors',
                on ? 'bg-imperial-burgundy text-ivory-canvas shadow-[0_4px_14px_rgba(78,24,37,0.25)]' : 'bg-surface-container-lowest shadow-[inset_0_0_0_1px_rgba(78,24,37,0.16)] hover:bg-blush-surface',
              )}
            >
              <span className="text-[19px] leading-snug" style={{ fontFamily: `'${p.family}', sans-serif` }}>
                {SAMPLE}
              </span>
              <span className={cn('font-label-sm text-label-sm', on ? 'text-rose-mist' : 'text-muted-rosewood')}>
                {p.label} · {p.note}
              </span>
            </button>
          );
        })}
        <CustomFontCard value={custom} family={customFamily} onChange={onChange} />
      </div>
    </section>
  );
}

function CustomFontCard({ value, family, onChange }: { value: CustomFont | null; family: string; onChange: (f: FontRef) => void }) {
  const regular = useRef<HTMLInputElement>(null);
  const bold = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'regular' | 'bold' | null>(null);
  const toast = useToast();

  const pick = async (file: File | undefined, which: 'regular' | 'bold') => {
    if (!file) return;
    setBusy(which);
    try {
      const url = await uploadFont(file);
      const name = value?.name || file.name.replace(/\.\w+$/, '').replace(/[-_]+/g, ' ').slice(0, 60);
      onChange(which === 'regular' ? { name, regular: url, ...(value?.bold ? { bold: value.bold } : {}) } : { ...(value as CustomFont), bold: url });
      toast.show(which === 'regular' ? 'تم رفع الخط' : 'تم رفع الخط العريض', 'check_circle');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'تعذر رفع الخط', 'error');
    } finally {
      setBusy(null);
      if (regular.current) regular.current.value = '';
      if (bold.current) bold.current.value = '';
    }
  };

  const inputs = (
    <>
      <input ref={regular} type="file" accept=".woff2,.woff,.ttf,.otf" className="hidden" onChange={(e) => void pick(e.target.files?.[0], 'regular')} />
      <input ref={bold} type="file" accept=".woff2,.woff,.ttf,.otf" className="hidden" onChange={(e) => void pick(e.target.files?.[0], 'bold')} />
    </>
  );

  if (!value) {
    return (
      <>
        <button
          type="button"
          onClick={() => regular.current?.click()}
          className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-rose-mist p-3 text-center text-imperial-burgundy hover:bg-blush-surface"
        >
          <Icon name={busy ? 'progress_activity' : 'upload_file'} className={cn('text-[24px]', busy && 'animate-spin')} />
          <span className="font-label-md text-label-md font-semibold">رفع خط من جهازك</span>
          <span className="font-label-sm text-label-sm text-muted-rosewood">WOFF2 أو TTF أو OTF</span>
        </button>
        {inputs}
      </>
    );
  }

  return (
    <div className="col-span-2 flex flex-col gap-2 rounded-xl bg-imperial-burgundy p-3 text-ivory-canvas shadow-[0_4px_14px_rgba(78,24,37,0.25)] sm:col-span-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-rose-mist">
          <Icon name="upload_file" className="text-[16px]" />
          خط مرفوع: {value.name}
        </span>
        <button type="button" onClick={() => regular.current?.click()} className="font-label-sm text-label-sm text-champagne-gold underline underline-offset-4">
          {busy === 'regular' ? 'جارٍ الرفع…' : 'تغيير الملف'}
        </button>
      </div>
      <p className="text-[22px] leading-snug" style={{ fontFamily: family }}>
        {SAMPLE} <span className="font-bold">{SAMPLE}</span>
      </p>
      <div className="flex flex-wrap items-center gap-3 font-label-sm text-label-sm">
        <span className={value.bold ? 'text-champagne-gold' : 'text-rose-mist'}>
          {value.bold ? '✓ ملف عريض للعناوين والأزرار' : 'بلا ملف عريض — سيُثخَّن الخط تلقائياً'}
        </span>
        <button type="button" onClick={() => bold.current?.click()} className="text-champagne-gold underline underline-offset-4">
          {busy === 'bold' ? 'جارٍ الرفع…' : value.bold ? 'تغيير العريض' : 'رفع ملف عريض (اختياري)'}
        </button>
      </div>
      {inputs}
    </div>
  );
}
