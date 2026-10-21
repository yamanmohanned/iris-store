import { useRef, useState } from 'react';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { Button, Card, OfflineNotice, ReadOnlyNotice, Toggle } from '@/components/admin/ui';
import { BrandMark, BrandWordmark, useBranding } from '@/components/common/BrandLogo';
import { Icon } from '@/components/common/Icon';
import { DEFAULT_BODY_FONT, DEFAULT_HEADING_FONT, type Branding } from '@/lib/branding';
import { cn } from '@/lib/cn';
import { uploadLogo } from '@/lib/image';
import { useAdminAuth } from '@/state/adminAuth';
import { useToast } from '@/state/toast';
import { useCatalogEditor } from '../useCatalogEditor';
import { FontPicker, usePreviewFamily } from './FontPicker';
import { SettingsHeader } from './SettingsLayout';

/** يحذف القيم الفارغة حتى يبقى الحفظ نظيفاً (لا شيء = الهوية الأصلية). */
function clean(b: Branding): Branding | undefined {
  const out: Branding = {};
  if (b.logo) out.logo = b.logo;
  if (b.logo && b.logoDark) out.logoDark = b.logoDark;
  if (b.logo && b.logoTint) out.logoTint = true;
  if (b.logo && b.showWordmark === false) out.showWordmark = false;
  if (b.bodyFont) out.bodyFont = b.bodyFont;
  if (b.headingFont) out.headingFont = b.headingFont;
  return Object.keys(out).length ? out : undefined;
}

/** الهوية: شعار المتجر (رفع صورة) وخطّا النصوص والعناوين (اختيار أو رفع ملف) مع معاينة مباشرة. */
export default function BrandingSettings() {
  const saved = useBranding();
  const { commit, saving, online } = useCatalogEditor();
  const { confirm } = useConfirm();
  const readOnly = !useAdminAuth().can('settings', 'edit');
  const [draft, setDraft] = useState<Branding>(saved);
  const dirty = JSON.stringify(clean(draft) ?? {}) !== JSON.stringify(clean(saved) ?? {});
  const set = (patch: Partial<Branding>) => setDraft((d) => ({ ...d, ...patch }));

  const save = (branding: Branding | undefined, message: string) =>
    commit((d) => {
      const { branding: _old, ...rest } = d.settings;
      return { ...d, settings: branding ? { ...rest, branding } : rest };
    }, message);

  const restore = async () => {
    const ok = await confirm({
      title: 'استعادة الهوية الأصلية؟',
      body: 'يعود شعار آيريس الأصلي وخطا IBM Plex Sans Arabic والمسيري. الملفات المرفوعة تبقى على الخادم ويمكنك اختيارها لاحقاً بإعادة رفعها.',
      confirmLabel: 'استعادة',
      icon: 'restart_alt',
    });
    if (ok && (await save(undefined, 'عادت الهوية الأصلية'))) setDraft({});
  };

  return (
    <>
      <SettingsHeader
        title="الهوية: الشعار والخطوط"
        description="ارفع شعار متجرك واختر خطاً للنصوص وآخر للعناوين؛ يُطبَّق ما تحفظه على المتجر ولوحة الإدارة فوراً، على الهاتف والكمبيوتر."
        actions={
          !readOnly && (
            <>
              <Button variant="ghost" icon="restart_alt" onClick={() => void restore()} disabled={!clean(saved) || saving}>
                الافتراضي
              </Button>
              <Button icon="check" busy={saving} disabled={!dirty} onClick={() => void save(clean(draft), 'تم حفظ الهوية')}>
                حفظ الهوية
              </Button>
            </>
          )
        }
      />
      {!online && <OfflineNotice message="الخادم غير متاح حالياً، لذلك لن تُحفظ الهوية." />}
      {readOnly && <ReadOnlyNotice />}

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-5">
          <Card className="flex flex-col gap-4">
            <h3 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">الشعار</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <LogoTile
                title="الشعار الرئيسي"
                hint="PNG بخلفية شفافة يعطي أجمل نتيجة."
                value={draft.logo ?? ''}
                onChange={(logo) => set({ logo: logo || undefined, ...(logo ? {} : { logoDark: undefined }) })}
                draft={draft}
              />
              <LogoTile
                title="نسخة للخلفيات الداكنة"
                hint="اختيارية — بدونها يظهر شعارك أبيض على الخلفيات الداكنة."
                value={draft.logoDark ?? ''}
                onChange={(logoDark) => set({ logoDark: logoDark || undefined })}
                draft={draft}
                dark
                disabled={!draft.logo}
              />
            </div>
            <div className={cn('flex flex-col gap-3 rounded-xl bg-blush-surface/50 p-4', !draft.logo && 'opacity-50')}>
              <Toggle
                checked={Boolean(draft.logoTint)}
                onChange={(logoTint) => draft.logo && set({ logoTint })}
                label="تلوين الشعار بألوان الموقع (عنابي على الفاتح، ذهبي على الداكن) — للشعارات الشفافة بلون واحد"
              />
              <Toggle
                checked={draft.showWordmark !== false}
                onChange={(on) => draft.logo && set({ showWordmark: on })}
                label="إظهار كلمة IRIS بجانب الشعار (أوقفها إن كان شعارك يحمل اسم المتجر)"
              />
            </div>
          </Card>

          <Card className="flex flex-col gap-6">
            <h3 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">الخطوط</h3>
            <FontPicker
              title="خط النصوص"
              hint="للفقرات والأسعار والأزرار والقوائم."
              value={draft.bodyFont}
              fallback={DEFAULT_BODY_FONT}
              previewKey="Body"
              onChange={(bodyFont) => set({ bodyFont })}
            />
            <FontPicker
              title="خط العناوين"
              hint="لعناوين الصفحات والأقسام وأسماء المنتجات الكبيرة."
              value={draft.headingFont}
              fallback={DEFAULT_HEADING_FONT}
              previewKey="Heading"
              onChange={(headingFont) => set({ headingFont })}
            />
          </Card>
        </fieldset>

        <LivePreview draft={draft} />
      </div>
    </>
  );
}

function LogoTile({
  title,
  hint,
  value,
  onChange,
  draft,
  dark,
  disabled,
}: {
  title: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
  draft: Branding;
  dark?: boolean;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadLogo(file));
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'تعذر رفع الشعار', 'error');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', disabled && 'pointer-events-none opacity-50')}>
      <div className={cn('flex h-32 items-center justify-center rounded-xl', dark ? 'bg-wine-night' : 'bg-ivory-canvas shadow-[inset_0_0_0_1px_rgba(78,24,37,0.12)]')}>
        <BrandMark branding={draft} onDark={dark} className={cn('h-16 max-w-[80%]', dark ? 'text-champagne-gold' : 'text-imperial-burgundy')} />
      </div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-label-lg text-label-lg text-warm-ink">{title}</p>
          <p className="font-label-sm text-label-sm text-muted-rosewood">{hint}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex h-9 items-center gap-1 rounded-lg bg-blush-surface px-3 font-label-md text-label-md text-imperial-burgundy hover:bg-rose-mist"
          >
            <Icon name={busy ? 'progress_activity' : 'upload'} className={cn('text-[18px]', busy && 'animate-spin')} />
            {value ? 'تغيير' : 'رفع'}
          </button>
          {value && (
            <button
              type="button"
              aria-label={`إزالة ${title}`}
              onClick={() => onChange('')}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-semantic-error hover:bg-semantic-error-bg"
            >
              <Icon name="delete" className="text-[18px]" />
            </button>
          )}
        </div>
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
    </div>
  );
}

/** معاينة مباشرة قبل الحفظ: ترويسة فاتحة وداكنة ونصوص بالخطين المختارين. */
function LivePreview({ draft }: { draft: Branding }) {
  const body = usePreviewFamily(draft.bodyFont, DEFAULT_BODY_FONT, 'Body');
  const heading = usePreviewFamily(draft.headingFont, DEFAULT_HEADING_FONT, 'Heading');
  return (
    <aside className="order-first 2xl:sticky 2xl:top-6 2xl:order-none 2xl:self-start">
      <Card className="flex flex-col gap-0 overflow-hidden !p-0">
        <p className="px-5 pb-2 pt-4 font-label-sm text-label-sm tracking-wider text-antique-gold">معاينة مباشرة</p>
        <div className="flex items-center justify-between bg-ivory-canvas px-5 py-4 shadow-[inset_0_-1px_0_rgba(78,24,37,0.1)]">
          <span className="flex items-center gap-2">
            <BrandMark branding={draft} className="h-9 text-imperial-burgundy" />
            <BrandWordmark branding={draft} className="text-2xl tracking-[0.22em] text-imperial-burgundy" />
          </span>
          <Icon name="shopping_bag" className="text-[22px] text-imperial-burgundy" />
        </div>
        <div className="flex items-center justify-center gap-2 bg-wine-night px-5 py-6">
          <BrandMark branding={draft} onDark className="h-12 text-champagne-gold" />
          <BrandWordmark branding={draft} className="text-[28px] tracking-[0.22em] text-champagne-gold" />
        </div>
        <div className="flex flex-col gap-2 px-5 py-5">
          <p className="text-[22px] font-bold leading-snug text-deep-oxblood" style={{ fontFamily: heading }}>
            قلادة الأمنيات 11:11
          </p>
          <p className="text-[15px] leading-relaxed text-muted-rosewood" style={{ fontFamily: body }}>
            ستانلس ستيل بطلاء ذهبي ثابت، تصلكِ مغلّفة وجاهزة للإهداء.
          </p>
          <p className="flex items-center justify-between" style={{ fontFamily: body }}>
            <span className="text-[18px] font-bold text-imperial-burgundy">8,000 د.ع</span>
            <span className="rounded-xl bg-imperial-burgundy px-4 py-2 text-[14px] font-semibold text-ivory-canvas">أضيفي للسلة</span>
          </p>
        </div>
      </Card>
    </aside>
  );
}
